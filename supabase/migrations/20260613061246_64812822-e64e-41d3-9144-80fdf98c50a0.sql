
-- 1) Add chat_locked to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS chat_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS chat_locked_at timestamptz;

-- Backfill: lock already-accepted bookings
UPDATE public.bookings
SET chat_locked = true, chat_locked_at = COALESCE(accepted_at, now())
WHERE status IN ('ACCEPTED','IN_PROGRESS','COMPLETED','PROVIDER_ON_THE_WAY')
  AND chat_locked = false;

-- 2) Create booking_special_requests
CREATE TABLE IF NOT EXISTS public.booking_special_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  provider_id uuid,
  request_type text NOT NULL CHECK (request_type IN ('REQUEST_OFFER','REQUEST_BETTER_OFFER','REQUEST_PRICE_LOCK')),
  request_text text NOT NULL,
  status text NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','SEEN','RESPONDED','CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  responded_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bsr_booking ON public.booking_special_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_bsr_provider ON public.booking_special_requests(provider_id);

GRANT SELECT, INSERT, UPDATE ON public.booking_special_requests TO authenticated;
GRANT ALL ON public.booking_special_requests TO service_role;

ALTER TABLE public.booking_special_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bsr_customer_select" ON public.booking_special_requests;
CREATE POLICY "bsr_customer_select" ON public.booking_special_requests
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.assigned_provider_id = auth.uid() OR b.reserved_provider_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.provider_quotes q WHERE q.booking_id = b.id AND q.provider_id = auth.uid()))
    )
    OR public.is_admin() OR public.is_cs()
  );

DROP POLICY IF EXISTS "bsr_customer_insert" ON public.booking_special_requests;
CREATE POLICY "bsr_customer_insert" ON public.booking_special_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "bsr_provider_update" ON public.booking_special_requests;
CREATE POLICY "bsr_provider_update" ON public.booking_special_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.assigned_provider_id = auth.uid() OR b.reserved_provider_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.provider_quotes q WHERE q.booking_id = b.id AND q.provider_id = auth.uid()))
    )
    OR public.is_admin() OR public.is_cs()
  );

-- 3) Trigger: block NORMAL messages once chat is locked
CREATE OR REPLACE FUNCTION public.block_messages_when_chat_locked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked boolean;
BEGIN
  -- Allow SYSTEM/OFFER_NOTICE messages even after lock (status updates, history)
  IF COALESCE(NEW.message_type, 'NORMAL') IN ('SYSTEM','OFFER_NOTICE') THEN
    RETURN NEW;
  END IF;
  SELECT chat_locked INTO locked FROM public.bookings WHERE id = NEW.booking_id;
  IF COALESCE(locked, false) = true THEN
    RAISE EXCEPTION 'chat_locked' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_messages_when_chat_locked ON public.booking_messages;
CREATE TRIGGER trg_block_messages_when_chat_locked
  BEFORE INSERT ON public.booking_messages
  FOR EACH ROW EXECUTE FUNCTION public.block_messages_when_chat_locked();

-- 4) Update provider_confirm_agreement to lock chat
CREATE OR REPLACE FUNCTION public.provider_confirm_agreement(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  b record;
  prov_name text;
  updated_id uuid;
BEGIN
  IF NOT is_provider() THEN RAISE EXCEPTION 'Only providers'; END IF;

  SELECT id, status, assigned_provider_id, reserved_provider_id INTO b
  FROM public.bookings WHERE id = _booking_id FOR UPDATE;

  IF b.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF b.assigned_provider_id IS NOT NULL AND b.assigned_provider_id <> me THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_assigned');
  END IF;
  IF b.reserved_provider_id IS NOT NULL AND b.reserved_provider_id <> me THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_reserved_by_you');
  END IF;

  UPDATE public.bookings
  SET status = 'ACCEPTED',
      assigned_provider_id = me,
      reserved_provider_id = me,
      assigned_at = COALESCE(assigned_at, now()),
      accepted_at = now(),
      assigned_by = COALESCE(assigned_by, 'self'),
      chat_locked = true,
      chat_locked_at = now()
  WHERE id = _booking_id
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'update_failed'); END IF;

  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (_booking_id, 'agreement_signed', me, 'provider', 'Provider signed agreement and accepted');

  SELECT full_name INTO prov_name FROM public.profiles WHERE user_id = me;

  -- SYSTEM message visible to both sides (bypasses chat lock)
  INSERT INTO public.booking_messages (booking_id, sender_id, sender_role, sender_display_name, body, message_type)
  VALUES (
    _booking_id, me, 'provider', COALESCE(prov_name, 'مقدم الخدمة'),
    '✅ تم قبول الطلب. تم إغلاق الدردشة العامة، ويمكنكم التواصل مباشرة عبر بيانات الاتصال.',
    'SYSTEM'
  );

  INSERT INTO public.staff_notifications (title, body, target_role, provider_id, booking_id)
  VALUES (
    '✅ مزود قبل طلباً عبر السوق',
    COALESCE(prov_name, 'مزود') || ' قبل الطلب',
    'admin', me, _booking_id
  );

  RETURN jsonb_build_object('success', true, 'booking_id', updated_id);
END;
$$;

-- 5) create_special_request RPC
CREATE OR REPLACE FUNCTION public.create_special_request(
  _booking_id uuid,
  _request_type text,
  _request_text text,
  _target_provider_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  b record;
  new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF _request_type NOT IN ('REQUEST_OFFER','REQUEST_BETTER_OFFER','REQUEST_PRICE_LOCK') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_type');
  END IF;

  SELECT id, customer_user_id, assigned_provider_id, status INTO b
  FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF b.customer_user_id <> me THEN RAISE EXCEPTION 'access_denied'; END IF;

  INSERT INTO public.booking_special_requests (booking_id, customer_id, provider_id, request_type, request_text)
  VALUES (_booking_id, me, COALESCE(_target_provider_id, b.assigned_provider_id), _request_type, _request_text)
  RETURNING id INTO new_id;

  -- Notify assigned/reserved provider(s)
  INSERT INTO public.staff_notifications (title, body, target_role, provider_id, booking_id)
  SELECT
    CASE _request_type
      WHEN 'REQUEST_OFFER' THEN '📩 طلب جديد: إرسال عرض'
      WHEN 'REQUEST_BETTER_OFFER' THEN '💬 العميل يطلب عرضًا أفضل'
      WHEN 'REQUEST_PRICE_LOCK' THEN '🔒 العميل يطلب تثبيت السعر'
    END,
    _request_text, 'provider', pid, _booking_id
  FROM (
    SELECT DISTINCT pid FROM (
      SELECT assigned_provider_id AS pid FROM public.bookings WHERE id = _booking_id AND assigned_provider_id IS NOT NULL
      UNION
      SELECT reserved_provider_id FROM public.bookings WHERE id = _booking_id AND reserved_provider_id IS NOT NULL
      UNION
      SELECT provider_id FROM public.provider_quotes WHERE booking_id = _booking_id
    ) x WHERE pid IS NOT NULL
  ) p;

  RETURN jsonb_build_object('success', true, 'id', new_id);
END;
$$;

-- 6) mark_special_requests_seen
CREATE OR REPLACE FUNCTION public.mark_special_requests_seen(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE me uuid := auth.uid(); n int;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  UPDATE public.booking_special_requests
  SET status = 'SEEN', seen_at = COALESCE(seen_at, now())
  WHERE booking_id = _booking_id
    AND status = 'SENT'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = _booking_id
        AND (b.assigned_provider_id = me OR b.reserved_provider_id = me
             OR EXISTS (SELECT 1 FROM public.provider_quotes q WHERE q.booking_id = b.id AND q.provider_id = me))
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'updated', n);
END;
$$;

-- 7) get_booking_contact_info — returns the *other* side's contact when chat is locked / status ACCEPTED+
CREATE OR REPLACE FUNCTION public.get_booking_contact_info(_booking_id uuid)
RETURNS TABLE(
  role text,
  full_name text,
  phone text,
  city text,
  address text,
  lat numeric,
  lng numeric,
  avatar_url text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  b record;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL THEN RETURN; END IF;
  IF b.status NOT IN ('ACCEPTED','IN_PROGRESS','PROVIDER_ON_THE_WAY','COMPLETED') THEN RETURN; END IF;

  -- Customer asking for provider info
  IF b.customer_user_id = me AND b.assigned_provider_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 'provider'::text, p.full_name, p.phone, p.city, NULL::text, NULL::numeric, NULL::numeric, p.avatar_url
    FROM public.profiles p WHERE p.user_id = b.assigned_provider_id;
    RETURN;
  END IF;

  -- Provider asking for customer info
  IF b.assigned_provider_id = me THEN
    RETURN QUERY
    SELECT 'customer'::text,
      COALESCE(bc.customer_name, b.customer_display_name),
      bc.customer_phone,
      b.city,
      bc.client_address_text,
      b.client_lat,
      b.client_lng,
      NULL::text
    FROM public.booking_contacts bc WHERE bc.booking_id = b.id;
    RETURN;
  END IF;

  -- Admin / CS get both? Return customer
  IF public.is_admin() OR public.is_cs() THEN
    RETURN QUERY
    SELECT 'customer'::text,
      COALESCE(bc.customer_name, b.customer_display_name),
      bc.customer_phone, b.city, bc.client_address_text, b.client_lat, b.client_lng, NULL::text
    FROM public.booking_contacts bc WHERE bc.booking_id = b.id;
  END IF;
END;
$$;

-- 8) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_special_requests;
