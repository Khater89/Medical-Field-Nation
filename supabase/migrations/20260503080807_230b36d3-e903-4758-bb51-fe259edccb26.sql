-- Marketplace: show ALL available bookings to providers (drop city/radius restriction)
-- Keep emergency vs standard separation by provider_type
-- Distance still computed and returned for sorting/display

CREATE OR REPLACE FUNCTION public.available_bookings_for_providers()
 RETURNS TABLE(id uuid, service_id text, city text, scheduled_at timestamp with time zone, booking_number text, area_public text, notes text, created_at timestamp with time zone, payment_method text, is_emergency boolean, distance_km numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me_lat numeric;
  me_lng numeric;
  me_type text;
BEGIN
  IF NOT is_provider() THEN
    RETURN;
  END IF;

  SELECT p.lat, p.lng, COALESCE(p.provider_type, 'standard')
    INTO me_lat, me_lng, me_type
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
  ORDER BY b.is_emergency DESC, b.created_at DESC;
END;
$function$;