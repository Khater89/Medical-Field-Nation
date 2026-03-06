
-- Add ai_safety_note to bookings (other AI fields already exist)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ai_safety_note text;

-- Add provider_agreement_version to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_agreement_version text;
