
-- Add provider_agreement_accepted_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS provider_agreement_accepted_at timestamptz DEFAULT NULL;

-- Add AI triage fields to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS voice_url text DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS voice_transcript text DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ai_service_match text DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ai_tools_list text[] DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS ai_summary text DEFAULT NULL;

-- Add client_disclaimer_accepted_at to bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_disclaimer_accepted_at timestamptz DEFAULT NULL;
