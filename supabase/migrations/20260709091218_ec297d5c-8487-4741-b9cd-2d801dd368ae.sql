
-- Roll back the earlier column-level revokes; the columns are being removed entirely.
GRANT SELECT (internal_note, otp_code, close_out_note, ai_safety_note) ON public.bookings TO authenticated;

-- 1. New staff-only table
CREATE TABLE public.bookings_staff (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  internal_note text,
  otp_code text,
  close_out_note text,
  ai_safety_note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings_staff TO authenticated;
GRANT ALL ON public.bookings_staff TO service_role;

ALTER TABLE public.bookings_staff ENABLE ROW LEVEL SECURITY;

-- Admin/CS full control
CREATE POLICY bookings_staff_admin_all ON public.bookings_staff
FOR ALL
USING (public.is_admin() OR public.is_cs())
WITH CHECK (public.is_admin() OR public.is_cs());

-- Provider may write close_out_note on their own assigned booking through the RPC below.
-- We do NOT grant provider SELECT here to preserve confidentiality (RPC handles the write).

-- 2. Backfill existing data
INSERT INTO public.bookings_staff (booking_id, internal_note, otp_code, close_out_note, ai_safety_note)
SELECT id, internal_note, otp_code, close_out_note, ai_safety_note
FROM public.bookings
WHERE internal_note IS NOT NULL
   OR otp_code IS NOT NULL
   OR close_out_note IS NOT NULL
   OR ai_safety_note IS NOT NULL
ON CONFLICT (booking_id) DO NOTHING;

-- 3. Drop sensitive columns from bookings (also drops the earlier column privilege revokes)
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS internal_note,
  DROP COLUMN IF EXISTS otp_code,
  DROP COLUMN IF EXISTS close_out_note,
  DROP COLUMN IF EXISTS ai_safety_note;

-- 4. Drop the earlier admin_get_booking_staff_fields RPC (columns no longer on bookings)
DROP FUNCTION IF EXISTS public.admin_get_booking_staff_fields(uuid[]);

-- 5. New RPC: admins/CS read staff fields
CREATE OR REPLACE FUNCTION public.admin_get_booking_staff_fields(p_booking_ids uuid[])
RETURNS TABLE (
  booking_id uuid,
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
    SELECT s.booking_id, s.internal_note, s.otp_code, s.close_out_note, s.ai_safety_note
    FROM public.bookings_staff s
    WHERE s.booking_id = ANY(p_booking_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_booking_staff_fields(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_booking_staff_fields(uuid[]) TO authenticated;

-- 6. RPC for providers to submit their close-out note on completion (they cannot read staff table)
CREATE OR REPLACE FUNCTION public.provider_set_close_out_note(p_booking_id uuid, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ok  boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = p_booking_id
      AND b.assigned_provider_id = v_uid
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.bookings_staff (booking_id, close_out_note)
  VALUES (p_booking_id, p_note)
  ON CONFLICT (booking_id) DO UPDATE SET close_out_note = EXCLUDED.close_out_note, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.provider_set_close_out_note(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.provider_set_close_out_note(uuid, text) TO authenticated;

-- 7. RPC for admins/CS to upsert internal_note (used by CS assignment/admin workflow)
CREATE OR REPLACE FUNCTION public.admin_set_booking_staff_fields(
  p_booking_id uuid,
  p_internal_note text DEFAULT NULL,
  p_otp_code text DEFAULT NULL,
  p_ai_safety_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_cs()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.bookings_staff (booking_id, internal_note, otp_code, ai_safety_note)
  VALUES (p_booking_id, p_internal_note, p_otp_code, p_ai_safety_note)
  ON CONFLICT (booking_id) DO UPDATE SET
    internal_note = COALESCE(EXCLUDED.internal_note, public.bookings_staff.internal_note),
    otp_code = COALESCE(EXCLUDED.otp_code, public.bookings_staff.otp_code),
    ai_safety_note = COALESCE(EXCLUDED.ai_safety_note, public.bookings_staff.ai_safety_note),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_booking_staff_fields(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_booking_staff_fields(uuid, text, text, text) TO authenticated;
