
-- 1. Restrict column-level access to staff-only fields on bookings.
-- Customers/providers no longer see internal_note, otp_code, close_out_note, ai_safety_note
-- via direct SELECT because Data API enforces column-level privileges before RLS row filtering.
REVOKE SELECT (internal_note, otp_code, close_out_note, ai_safety_note) ON public.bookings FROM authenticated;
REVOKE SELECT (internal_note, otp_code, close_out_note, ai_safety_note) ON public.bookings FROM anon;
-- service_role keeps ALL, but be explicit
GRANT SELECT (internal_note, otp_code, close_out_note, ai_safety_note) ON public.bookings TO service_role;

-- 2. SECURITY DEFINER RPC so admins/CS can still read the staff-only fields.
CREATE OR REPLACE FUNCTION public.admin_get_booking_staff_fields(p_booking_ids uuid[])
RETURNS TABLE (
  id uuid,
  internal_note text,
  otp_code text,
  close_out_note text,
  ai_safety_note text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_cs()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
    SELECT b.id, b.internal_note, b.otp_code, b.close_out_note, b.ai_safety_note
    FROM public.bookings b
    WHERE b.id = ANY(p_booking_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_booking_staff_fields(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_booking_staff_fields(uuid[]) TO authenticated;

-- 3. Tighten booking_special_requests provider UPDATE policy with an explicit WITH CHECK
-- that pins immutable identifiers so a provider cannot reassign a request to another
-- booking or customer.
DROP POLICY IF EXISTS bsr_provider_update ON public.booking_special_requests;
CREATE POLICY bsr_provider_update ON public.booking_special_requests
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_special_requests.booking_id
      AND (
        b.assigned_provider_id = auth.uid()
        OR b.reserved_provider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.provider_quotes q
          WHERE q.booking_id = b.id AND q.provider_id = auth.uid()
        )
      )
  ))
  OR public.is_admin() OR public.is_cs()
)
WITH CHECK (
  -- Preserve identifiers exactly; providers/staff may only mutate non-identity fields.
  booking_id = (SELECT bsr.booking_id FROM public.booking_special_requests bsr WHERE bsr.id = booking_special_requests.id)
  AND customer_id = (SELECT bsr.customer_id FROM public.booking_special_requests bsr WHERE bsr.id = booking_special_requests.id)
  AND (
    (EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_special_requests.booking_id
        AND (
          b.assigned_provider_id = auth.uid()
          OR b.reserved_provider_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.provider_quotes q
            WHERE q.booking_id = b.id AND q.provider_id = auth.uid()
          )
        )
    ))
    OR public.is_admin() OR public.is_cs()
  )
);
