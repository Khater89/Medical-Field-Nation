-- 1) Emergency flag on bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_emergency boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_bookings_emergency_status ON public.bookings(is_emergency, status);
CREATE INDEX IF NOT EXISTS idx_bookings_status_city ON public.bookings(status, city) WHERE status = 'NEW';

-- 2) Provider type on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_type text NOT NULL DEFAULT 'standard'
  CHECK (provider_type IN ('standard', 'emergency'));

-- 3) Drop & recreate available_bookings_for_providers
DROP FUNCTION IF EXISTS public.available_bookings_for_providers();

CREATE FUNCTION public.available_bookings_for_providers()
RETURNS TABLE(
  id uuid, service_id text, city text, scheduled_at timestamp with time zone,
  booking_number text, area_public text, notes text, created_at timestamp with time zone,
  payment_method text, is_emergency boolean, distance_km numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me_lat numeric;
  me_lng numeric;
  me_city text;
  me_radius integer;
  me_type text;
BEGIN
  IF NOT is_provider() THEN
    RETURN;
  END IF;

  SELECT p.lat, p.lng, p.city, COALESCE(p.radius_km, 20), COALESCE(p.provider_type, 'standard')
    INTO me_lat, me_lng, me_city, me_radius, me_type
  FROM public.profiles p WHERE p.user_id = auth.uid();

  RETURN QUERY
  SELECT
    b.id, b.service_id, b.city, b.scheduled_at, b.booking_number,
    b.area_public, b.notes, b.created_at, b.payment_method, b.is_emergency,
    public.haversine_distance(me_lat, me_lng, b.client_lat, b.client_lng) AS distance_km
  FROM public.bookings b
  WHERE b.status = 'NEW'
    AND b.assigned_provider_id IS NULL
    AND (
      (me_type = 'emergency' AND b.is_emergency = true)
      OR (me_type = 'standard' AND b.is_emergency = false)
    )
    AND (
      (me_city IS NOT NULL AND b.city IS NOT NULL AND lower(trim(me_city)) = lower(trim(b.city)))
      OR (
        me_lat IS NOT NULL AND me_lng IS NOT NULL
        AND b.client_lat IS NOT NULL AND b.client_lng IS NOT NULL
        AND public.haversine_distance(me_lat, me_lng, b.client_lat, b.client_lng) <= me_radius
      )
    )
  ORDER BY b.is_emergency DESC, b.created_at DESC;
END;
$$;

-- 4) Self-assign RPC
CREATE OR REPLACE FUNCTION public.provider_self_assign(_booking_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  me_type text;
  b record;
  updated_id uuid;
BEGIN
  IF NOT is_provider() THEN
    RAISE EXCEPTION 'Only providers can self-assign';
  END IF;

  SELECT COALESCE(provider_type, 'standard') INTO me_type
  FROM public.profiles WHERE user_id = me;

  SELECT id, status, assigned_provider_id, is_emergency INTO b
  FROM public.bookings WHERE id = _booking_id FOR UPDATE;

  IF b.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF b.assigned_provider_id IS NOT NULL OR b.status <> 'NEW' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_taken');
  END IF;
  IF b.is_emergency AND me_type <> 'emergency' THEN
    RETURN jsonb_build_object('success', false, 'error', 'emergency_only');
  END IF;
  IF NOT b.is_emergency AND me_type = 'emergency' THEN
    RETURN jsonb_build_object('success', false, 'error', 'standard_only');
  END IF;

  UPDATE public.bookings
  SET status = 'ASSIGNED', assigned_provider_id = me, assigned_at = now(), assigned_by = 'self'
  WHERE id = _booking_id AND status = 'NEW' AND assigned_provider_id IS NULL
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'race_lost');
  END IF;

  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (_booking_id, 'self_assigned', me, 'provider', 'Provider self-assigned via marketplace');

  RETURN jsonb_build_object('success', true, 'booking_id', updated_id);
END;
$$;

-- 5) Customer accepts a quote
CREATE OR REPLACE FUNCTION public.customer_accept_quote(_quote_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  q record;
  b record;
  updated_id uuid;
BEGIN
  SELECT * INTO q FROM public.provider_quotes WHERE id = _quote_id;
  IF q.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'quote_not_found');
  END IF;

  SELECT id, status, assigned_provider_id, customer_user_id INTO b
  FROM public.bookings WHERE id = q.booking_id FOR UPDATE;

  IF b.customer_user_id <> me THEN
    RAISE EXCEPTION 'Only the order owner can accept quotes';
  END IF;
  IF b.assigned_provider_id IS NOT NULL OR b.status <> 'NEW' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_assigned');
  END IF;

  UPDATE public.bookings
  SET status = 'ASSIGNED', assigned_provider_id = q.provider_id,
      assigned_at = now(), assigned_by = 'customer_quote', agreed_price = q.quoted_price
  WHERE id = q.booking_id AND status = 'NEW' AND assigned_provider_id IS NULL
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'race_lost');
  END IF;

  UPDATE public.provider_quotes SET status = 'accepted' WHERE id = _quote_id;
  UPDATE public.provider_quotes SET status = 'rejected'
    WHERE booking_id = q.booking_id AND id <> _quote_id AND status = 'pending';

  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (q.booking_id, 'quote_accepted', me, 'customer',
          'Customer accepted quote ' || q.quoted_price || ' JOD');

  INSERT INTO public.staff_notifications (title, body, target_role, provider_id, booking_id)
  VALUES ('🎉 تم قبول عرضك',
          'قبل العميل عرضك بقيمة ' || q.quoted_price || ' دينار. ابدأ بالتنسيق.',
          'provider', q.provider_id, q.booking_id);

  RETURN jsonb_build_object('success', true, 'booking_id', updated_id);
END;
$$;

-- 6) Customer-visible quotes RPC
CREATE OR REPLACE FUNCTION public.customer_quotes_for_booking(_booking_id uuid)
RETURNS TABLE(
  id uuid, quoted_price numeric, note text, created_at timestamp with time zone,
  provider_id uuid, provider_name text, provider_rating numeric, provider_completed_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.bookings WHERE id = _booking_id AND customer_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    q.id, q.quoted_price, q.note, q.created_at, q.provider_id,
    COALESCE(p.full_name, 'مزود الخدمة'),
    COALESCE((SELECT ROUND(AVG(r.rating)::numeric, 1) FROM public.provider_ratings r WHERE r.provider_id = q.provider_id), 0),
    COALESCE((SELECT COUNT(*)::int FROM public.bookings cb WHERE cb.assigned_provider_id = q.provider_id AND cb.status = 'COMPLETED'), 0)
  FROM public.provider_quotes q
  LEFT JOIN public.profiles p ON p.user_id = q.provider_id
  WHERE q.booking_id = _booking_id AND q.status = 'pending'
  ORDER BY q.quoted_price ASC, q.created_at ASC;
END;
$$;

-- 7) Trigger: notify emergency providers
CREATE OR REPLACE FUNCTION public.notify_emergency_providers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_emergency = true AND NEW.status = 'NEW' THEN
    INSERT INTO public.staff_notifications (title, body, target_role, provider_id, booking_id)
    SELECT
      '🚨 طلب طوارئ جديد',
      'طلب طوارئ في ' || COALESCE(NEW.city, 'منطقتك') || ' — استجب فوراً',
      'provider', p.user_id, NEW.id
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'provider'
    WHERE COALESCE(p.provider_type, 'standard') = 'emergency'
      AND p.provider_status = 'approved';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_emergency_providers ON public.bookings;
CREATE TRIGGER trg_notify_emergency_providers
AFTER INSERT ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_emergency_providers();