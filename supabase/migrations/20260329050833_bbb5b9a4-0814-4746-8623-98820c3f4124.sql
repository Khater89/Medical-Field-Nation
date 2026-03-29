
-- Add provider_number column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_number integer;

-- Create sequence for provider numbers
CREATE SEQUENCE IF NOT EXISTS public.provider_number_seq START WITH 1001;

-- Backfill existing providers with sequential numbers
WITH numbered AS (
  SELECT p.user_id, ROW_NUMBER() OVER (ORDER BY p.created_at) + 1000 AS num
  FROM public.profiles p
  WHERE p.user_id IN (SELECT user_id FROM public.user_roles WHERE role = 'provider')
  AND p.provider_number IS NULL
)
UPDATE public.profiles p SET provider_number = n.num
FROM numbered n WHERE p.user_id = n.user_id;

-- Set sequence to max existing value
SELECT setval('public.provider_number_seq', COALESCE((SELECT MAX(provider_number) FROM public.profiles), 1000));

-- Trigger to auto-assign provider_number
CREATE OR REPLACE FUNCTION public.assign_provider_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.provider_number IS NULL AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'provider'
  ) THEN
    NEW.provider_number := nextval('public.provider_number_seq');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_provider_number
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_provider_number();
