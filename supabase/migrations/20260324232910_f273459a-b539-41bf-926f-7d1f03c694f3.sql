CREATE OR REPLACE FUNCTION public.get_provider_bookings()
 RETURNS TABLE(id uuid, booking_number text, service_id text, city text, scheduled_at timestamp with time zone, status text, provider_payout numeric, subtotal numeric, agreed_price numeric, assigned_provider_id uuid, assigned_at timestamp with time zone, accepted_at timestamp with time zone, created_at timestamp with time zone, customer_display_name text, customer_phone text, client_address_text text, client_lat numeric, client_lng numeric, notes text, check_in_at timestamp with time zone, check_out_at timestamp with time zone, actual_duration_minutes integer, calculated_total numeric, otp_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.booking_number, b.service_id, b.city,
    b.scheduled_at, b.status, b.provider_payout,
    b.subtotal, b.agreed_price, b.assigned_provider_id,
    b.assigned_at, b.accepted_at, b.created_at,
    CASE
      WHEN b.accepted_at IS NOT NULL AND b.assigned_provider_id = auth.uid()
      THEN COALESCE(bc.customer_name, b.customer_display_name)
      ELSE COALESCE(split_part(bc.customer_name, ' ', 1), b.customer_display_name)
    END,
    NULL::text,
    CASE
      WHEN b.accepted_at IS NOT NULL AND b.assigned_provider_id = auth.uid()
      THEN bc.client_address_text
      ELSE NULL
    END,
    CASE
      WHEN b.accepted_at IS NOT NULL AND b.assigned_provider_id = auth.uid()
      THEN b.client_lat
      ELSE ROUND(b.client_lat, 1)
    END,
    CASE
      WHEN b.accepted_at IS NOT NULL AND b.assigned_provider_id = auth.uid()
      THEN b.client_lng
      ELSE ROUND(b.client_lng, 1)
    END,
    CASE
      WHEN b.accepted_at IS NOT NULL AND b.assigned_provider_id = auth.uid()
      THEN b.notes
      ELSE NULL
    END,
    b.check_in_at,
    b.check_out_at,
    b.actual_duration_minutes,
    b.calculated_total,
    NULL::text  -- OTP is NEVER exposed to provider; verified server-side only
  FROM public.bookings b
  LEFT JOIN public.booking_contacts bc ON bc.booking_id = b.id
  WHERE b.assigned_provider_id = auth.uid() AND is_provider()
  ORDER BY b.scheduled_at DESC;
END;
$function$;