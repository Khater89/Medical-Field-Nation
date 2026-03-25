
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS last_provider_reminder_at timestamp with time zone DEFAULT NULL;
