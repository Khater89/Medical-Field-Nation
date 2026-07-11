
CREATE OR REPLACE FUNCTION public.provider_checkout_booking(
  _booking_id uuid,
  _duration_minutes integer,
  _calculated_total numeric
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  b public.bookings;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF b.assigned_provider_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF b.status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Booking is not in progress' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET check_out_at = now(),
      actual_duration_minutes = _duration_minutes,
      calculated_total = _calculated_total
  WHERE id = _booking_id
  RETURNING * INTO b;

  RETURN b;
END;
$$;

REVOKE ALL ON FUNCTION public.provider_checkout_booking(uuid, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_checkout_booking(uuid, integer, numeric) TO authenticated;
