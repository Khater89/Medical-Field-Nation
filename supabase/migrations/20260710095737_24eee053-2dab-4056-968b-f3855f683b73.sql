
-- 1) Username on profiles (nullable for legacy customers/providers)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
  ON public.profiles (LOWER(username))
  WHERE username IS NOT NULL;

-- 2) Track consumption of verified OTP separately from "verified"
ALTER TABLE public.phone_otps ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;

-- 3) Username availability helper (safe to call anonymously)
CREATE OR REPLACE FUNCTION public.username_available(_u TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE LOWER(username) = LOWER(_u)
  );
$$;

GRANT EXECUTE ON FUNCTION public.username_available(TEXT) TO anon, authenticated;
