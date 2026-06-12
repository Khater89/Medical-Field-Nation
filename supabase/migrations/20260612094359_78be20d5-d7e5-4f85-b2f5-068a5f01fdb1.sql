
-- Provider notifications table for booking reminders
CREATE TABLE IF NOT EXISTS public.provider_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('ONE_HOUR_BEFORE','DUE_NOW','OVERDUE_REMINDER')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT, UPDATE ON public.provider_notifications TO authenticated;
GRANT ALL ON public.provider_notifications TO service_role;

ALTER TABLE public.provider_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "providers read own notifications"
  ON public.provider_notifications FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid() OR public.is_admin() OR public.is_cs());

CREATE POLICY "providers update own is_read"
  ON public.provider_notifications FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Unique constraint for non-recurring types
CREATE UNIQUE INDEX IF NOT EXISTS provider_notifications_unique_single
  ON public.provider_notifications (booking_id, provider_id, type)
  WHERE type IN ('ONE_HOUR_BEFORE','DUE_NOW');

CREATE INDEX IF NOT EXISTS idx_provider_notifications_provider ON public.provider_notifications(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_booking ON public.provider_notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_is_read ON public.provider_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_created_at ON public.provider_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_notifications_overdue
  ON public.provider_notifications(booking_id, provider_id, created_at DESC)
  WHERE type = 'OVERDUE_REMINDER';

ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_notifications;
ALTER TABLE public.provider_notifications REPLICA IDENTITY FULL;
