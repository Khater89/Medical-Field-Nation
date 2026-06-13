
-- 1. Bookings: price lock fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS price_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_locked_by UUID,
  ADD COLUMN IF NOT EXISTS final_price NUMERIC,
  ADD COLUMN IF NOT EXISTS final_offer_id UUID;

-- 2. booking_messages: type
ALTER TABLE public.booking_messages
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'NORMAL';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_messages_message_type_check') THEN
    ALTER TABLE public.booking_messages
      ADD CONSTRAINT booking_messages_message_type_check
      CHECK (message_type IN ('NORMAL','REQUEST_OFFER','REQUEST_BETTER_OFFER','REQUEST_PRICE_LOCK','SYSTEM','OFFER_NOTICE'));
  END IF;
END $$;

-- 3. Trigger: block new quotes after price lock
CREATE OR REPLACE FUNCTION public.block_quotes_when_price_locked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked boolean;
BEGIN
  SELECT price_locked INTO locked FROM public.bookings WHERE id = NEW.booking_id;
  IF COALESCE(locked, false) = true THEN
    RAISE EXCEPTION 'price_locked' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_quotes_when_price_locked ON public.provider_quotes;
CREATE TRIGGER trg_block_quotes_when_price_locked
BEFORE INSERT OR UPDATE OF quoted_price ON public.provider_quotes
FOR EACH ROW EXECUTE FUNCTION public.block_quotes_when_price_locked();

-- 4. Extend send_booking_message to accept _message_type
CREATE OR REPLACE FUNCTION public.send_booking_message(
  _booking_id uuid,
  _sender_role text,
  _body text,
  _quoted_price numeric DEFAULT NULL::numeric,
  _target_provider_id uuid DEFAULT NULL::uuid,
  _sender_display_name text DEFAULT NULL::text,
  _message_type text DEFAULT 'NORMAL'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  b record;
  display_name text;
  new_message_id uuid;
  mtype text := COALESCE(_message_type, 'NORMAL');
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF length(trim(COALESCE(_body, ''))) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_message');
  END IF;
  IF mtype NOT IN ('NORMAL','REQUEST_OFFER','REQUEST_BETTER_OFFER','REQUEST_PRICE_LOCK','SYSTEM','OFFER_NOTICE') THEN
    mtype := 'NORMAL';
  END IF;

  SELECT id, customer_user_id, status INTO b FROM public.bookings WHERE id = _booking_id;
  IF b.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'booking_not_found'); END IF;

  IF _sender_role = 'customer' THEN
    IF b.customer_user_id IS DISTINCT FROM me THEN RAISE EXCEPTION 'Access denied'; END IF;
    SELECT COALESCE(NULLIF(trim(_sender_display_name), ''), NULLIF(trim(p.full_name), ''), 'العميل')
      INTO display_name FROM public.profiles p WHERE p.user_id = me;
    INSERT INTO public.booking_messages (
      booking_id, sender_id, sender_role, sender_display_name, body, target_provider_id, message_type
    ) VALUES (
      _booking_id, me, 'customer', COALESCE(display_name, 'العميل'),
      trim(_body), _target_provider_id, mtype
    ) RETURNING id INTO new_message_id;

  ELSIF _sender_role = 'provider' THEN
    IF NOT public.can_provider_message_booking(_booking_id, me) THEN RAISE EXCEPTION 'Access denied'; END IF;
    SELECT COALESCE(NULLIF(trim(_sender_display_name), ''), NULLIF(trim(p.full_name), ''), 'مزود الخدمة')
      INTO display_name FROM public.profiles p WHERE p.user_id = me;
    INSERT INTO public.booking_messages (
      booking_id, sender_id, sender_role, sender_display_name, body, quoted_price, target_provider_id, message_type
    ) VALUES (
      _booking_id, me, 'provider', COALESCE(display_name, 'مزود الخدمة'),
      trim(_body), _quoted_price, _target_provider_id, mtype
    ) RETURNING id INTO new_message_id;
  ELSE
    RAISE EXCEPTION 'invalid sender_role';
  END IF;

  RETURN jsonb_build_object('success', true, 'message_id', new_message_id);
END;
$$;

-- 5. provider_lock_price RPC
CREATE OR REPLACE FUNCTION public.provider_lock_price(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  b record;
  q record;
  prov_name text;
BEGIN
  IF NOT public.is_provider() THEN RAISE EXCEPTION 'Only providers'; END IF;

  SELECT id, status, assigned_provider_id, reserved_provider_id, price_locked
    INTO b
  FROM public.bookings WHERE id = _booking_id FOR UPDATE;

  IF b.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF b.price_locked = true THEN RETURN jsonb_build_object('success', false, 'error', 'already_locked'); END IF;
  IF b.status IN ('COMPLETED','CANCELLED','REJECTED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'closed');
  END IF;

  -- Authorization: must be assigned/reserved provider OR have a quote on this booking
  IF NOT (
    b.assigned_provider_id = me OR b.reserved_provider_id = me
    OR EXISTS (SELECT 1 FROM public.provider_quotes WHERE booking_id = _booking_id AND provider_id = me)
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Find this provider's latest quote
  SELECT id, quoted_price INTO q
  FROM public.provider_quotes
  WHERE booking_id = _booking_id AND provider_id = me
  ORDER BY created_at DESC
  LIMIT 1;

  IF q.id IS NULL OR q.quoted_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_offer');
  END IF;

  UPDATE public.bookings
  SET price_locked = true,
      price_locked_at = now(),
      price_locked_by = me,
      final_price = q.quoted_price,
      final_offer_id = q.id,
      agreed_price = q.quoted_price
  WHERE id = _booking_id;

  SELECT full_name INTO prov_name FROM public.profiles WHERE user_id = me;

  INSERT INTO public.booking_messages (booking_id, sender_id, sender_role, sender_display_name, body, quoted_price, message_type)
  VALUES (
    _booking_id, me, 'provider', COALESCE(prov_name,'مقدم الخدمة'),
    '🔒 تم تثبيت السعر النهائي: ' || q.quoted_price || ' د.أ. لا يمكن تعديل السعر بعد الآن.',
    q.quoted_price, 'SYSTEM'
  );

  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (_booking_id, 'price_locked', me, 'provider',
          'Price locked at ' || q.quoted_price || ' JOD');

  RETURN jsonb_build_object('success', true, 'final_price', q.quoted_price);
END;
$$;

GRANT EXECUTE ON FUNCTION public.provider_lock_price(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_booking_message(uuid, text, text, numeric, uuid, text, text) TO authenticated;
