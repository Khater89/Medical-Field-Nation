
-- 1. Add reserved_provider_id to bookings (soft-claim before agreement)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reserved_provider_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reserved_at timestamptz;

-- 2. Booking messages table (group chat per booking)
CREATE TABLE IF NOT EXISTS public.booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('customer','provider')),
  sender_display_name text,
  body text NOT NULL,
  quoted_price numeric,
  target_provider_id uuid, -- if customer wants to direct to one provider; null = broadcast
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking ON public.booking_messages(booking_id, created_at);

ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Admin/CS full access
CREATE POLICY admin_all_messages ON public.booking_messages FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY cs_all_messages ON public.booking_messages FOR ALL
  USING (is_cs()) WITH CHECK (is_cs());

-- Customer can read own booking messages
CREATE POLICY customer_read_messages ON public.booking_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND b.customer_user_id = auth.uid()
  ));

-- Customer can insert messages on own booking
CREATE POLICY customer_insert_messages ON public.booking_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND sender_role = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_messages.booking_id
        AND b.customer_user_id = auth.uid()
    )
  );

-- Provider can read messages on bookings they have visibility on:
-- (a) booking is NEW + matches their type, OR (b) they are assigned/reserved
CREATE POLICY provider_read_messages ON public.booking_messages FOR SELECT
  USING (is_provider() AND EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE b.id = booking_messages.booking_id
      AND (
        b.assigned_provider_id = auth.uid()
        OR b.reserved_provider_id = auth.uid()
        OR (
          b.status = 'NEW' AND b.assigned_provider_id IS NULL
          AND (
            (COALESCE(p.provider_type, 'standard') = 'emergency' AND b.is_emergency = true)
            OR (COALESCE(p.provider_type, 'standard') = 'standard' AND b.is_emergency = false)
          )
        )
      )
  ));

-- Provider can insert messages on bookings they can see
CREATE POLICY provider_insert_messages ON public.booking_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND sender_role = 'provider' AND is_provider()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE b.id = booking_messages.booking_id
        AND (
          b.assigned_provider_id = auth.uid()
          OR b.reserved_provider_id = auth.uid()
          OR (
            b.status = 'NEW' AND b.assigned_provider_id IS NULL
            AND (
              (COALESCE(p.provider_type, 'standard') = 'emergency' AND b.is_emergency = true)
              OR (COALESCE(p.provider_type, 'standard') = 'standard' AND b.is_emergency = false)
            )
          )
        )
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;

-- 3. Update marketplace RPC to include base_price
DROP FUNCTION IF EXISTS public.available_bookings_for_providers();
CREATE OR REPLACE FUNCTION public.available_bookings_for_providers()
 RETURNS TABLE(
   id uuid, service_id text, city text, scheduled_at timestamptz,
   booking_number text, area_public text, notes text, created_at timestamptz,
   payment_method text, is_emergency boolean, distance_km numeric,
   base_price numeric, service_name text, viewer_count integer, quote_count integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me_lat numeric; me_lng numeric; me_type text;
BEGIN
  IF NOT is_provider() THEN RETURN; END IF;

  SELECT p.lat, p.lng, COALESCE(p.provider_type, 'standard')
    INTO me_lat, me_lng, me_type
  FROM public.profiles p WHERE p.user_id = auth.uid();

  RETURN QUERY
  SELECT
    b.id, b.service_id, b.city, b.scheduled_at, b.booking_number,
    b.area_public, b.notes, b.created_at, b.payment_method, b.is_emergency,
    public.haversine_distance(me_lat, me_lng, b.client_lat, b.client_lng) AS distance_km,
    s.base_price,
    COALESCE(s.name, b.service_id) AS service_name,
    (SELECT COUNT(DISTINCT sender_id)::int FROM public.booking_messages bm
       WHERE bm.booking_id = b.id AND bm.sender_role = 'provider') AS viewer_count,
    (SELECT COUNT(*)::int FROM public.provider_quotes pq WHERE pq.booking_id = b.id) AS quote_count
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id::text = b.service_id
  WHERE b.status = 'NEW' AND b.assigned_provider_id IS NULL
    AND (
      (me_type = 'emergency' AND b.is_emergency = true)
      OR (me_type = 'standard' AND b.is_emergency = false)
    )
  ORDER BY b.is_emergency DESC, b.created_at DESC;
END;
$function$;

-- 4. RPC: get all quotes on a booking (for transparency among providers)
CREATE OR REPLACE FUNCTION public.booking_quotes_public(_booking_id uuid)
 RETURNS TABLE(
   id uuid, provider_id uuid, provider_name text, provider_avatar text,
   provider_role text, quoted_price numeric, note text, created_at timestamptz, is_mine boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow if requester is provider with visibility, customer of booking, admin, or cs
  IF NOT (
    is_admin() OR is_cs()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = auth.uid())
    OR (is_provider() AND EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE b.id = _booking_id
        AND (
          b.assigned_provider_id = auth.uid()
          OR b.reserved_provider_id = auth.uid()
          OR (b.status = 'NEW' AND (
              (COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency = true)
              OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency = false)
          ))
        )
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT q.id, q.provider_id,
         COALESCE(p.full_name, 'مزود الخدمة'),
         p.avatar_url, p.role_type,
         q.quoted_price, q.note, q.created_at,
         (q.provider_id = auth.uid())
  FROM public.provider_quotes q
  LEFT JOIN public.profiles p ON p.user_id = q.provider_id
  WHERE q.booking_id = _booking_id
  ORDER BY q.created_at ASC;
END;
$function$;

-- 5. Reserve booking for agreement (replaces immediate self-assign)
CREATE OR REPLACE FUNCTION public.provider_reserve_booking(_booking_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  me_type text;
  b record;
  updated_id uuid;
BEGIN
  IF NOT is_provider() THEN RAISE EXCEPTION 'Only providers'; END IF;

  SELECT COALESCE(provider_type,'standard') INTO me_type FROM public.profiles WHERE user_id = me;

  SELECT id, status, assigned_provider_id, reserved_provider_id, is_emergency INTO b
  FROM public.bookings WHERE id = _booking_id FOR UPDATE;

  IF b.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF b.assigned_provider_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_assigned');
  END IF;
  IF b.reserved_provider_id IS NOT NULL AND b.reserved_provider_id <> me THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_reserved');
  END IF;
  IF b.is_emergency AND me_type <> 'emergency' THEN
    RETURN jsonb_build_object('success', false, 'error', 'emergency_only');
  END IF;
  IF NOT b.is_emergency AND me_type = 'emergency' THEN
    RETURN jsonb_build_object('success', false, 'error', 'standard_only');
  END IF;

  UPDATE public.bookings
  SET reserved_provider_id = me, reserved_at = now()
  WHERE id = _booking_id AND assigned_provider_id IS NULL
    AND (reserved_provider_id IS NULL OR reserved_provider_id = me)
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'race_lost'); END IF;
  RETURN jsonb_build_object('success', true, 'booking_id', updated_id);
END;
$function$;

-- 6. Confirm agreement -> assign + accept
CREATE OR REPLACE FUNCTION public.provider_confirm_agreement(_booking_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  b record;
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
      assigned_by = COALESCE(assigned_by, 'self')
  WHERE id = _booking_id
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'update_failed'); END IF;

  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (_booking_id, 'agreement_signed', me, 'provider', 'Provider signed agreement and accepted');

  RETURN jsonb_build_object('success', true, 'booking_id', updated_id);
END;
$function$;

-- 7. RPC: list booking messages (combines reads with sender enrichment)
CREATE OR REPLACE FUNCTION public.list_booking_messages(_booking_id uuid)
 RETURNS TABLE(
   id uuid, sender_id uuid, sender_role text, sender_display_name text,
   body text, quoted_price numeric, target_provider_id uuid, created_at timestamptz, sender_avatar text
 )
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Reuse the same visibility checks as booking_quotes_public
  IF NOT (
    is_admin() OR is_cs()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = auth.uid())
    OR (is_provider() AND EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE b.id = _booking_id
        AND (
          b.assigned_provider_id = auth.uid()
          OR b.reserved_provider_id = auth.uid()
          OR (b.status = 'NEW' AND (
              (COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency = true)
              OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency = false)
          ))
        )
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT m.id, m.sender_id, m.sender_role,
         COALESCE(m.sender_display_name, p.full_name, 'مستخدم'),
         m.body, m.quoted_price, m.target_provider_id, m.created_at,
         p.avatar_url
  FROM public.booking_messages m
  LEFT JOIN public.profiles p ON p.user_id = m.sender_id
  WHERE m.booking_id = _booking_id
  ORDER BY m.created_at ASC;
END;
$function$;
