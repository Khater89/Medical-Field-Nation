
-- 1) Normalization helper for Jordanian phones
CREATE OR REPLACE FUNCTION public.normalize_jo_phone(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d text;
BEGIN
  IF _raw IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(_raw, '\D', '', 'g');
  -- strip leading zeros
  d := regexp_replace(d, '^0+', '');
  -- If starts with 962 -> already country code
  IF d ~ '^962[7-9][0-9]{8}$' THEN
    RETURN '+' || d;
  END IF;
  -- Local Jordanian mobile: starts with 7 and 9 digits total
  IF d ~ '^[7-9][0-9]{8}$' THEN
    RETURN '+962' || d;
  END IF;
  -- Fallback: accept full E.164-looking numbers
  IF d ~ '^[1-9][0-9]{7,14}$' THEN
    RETURN '+' || d;
  END IF;
  RETURN NULL;
END;
$$;

-- 2) OTP storage
CREATE TABLE IF NOT EXISTS public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS phone_otps_phone_idx ON public.phone_otps (phone, created_at DESC);

-- No public grants — service role only
GRANT ALL ON public.phone_otps TO service_role;

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (which bypasses RLS) can access.
