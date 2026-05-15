-- Fix: restrict notifications_log INSERT to authenticated (not public)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications_log;
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix: remove permissive authenticated INSERT on staff_notifications.
-- All inserters are SECURITY DEFINER functions/triggers and the service role,
-- which bypass RLS, so end users no longer need INSERT rights.
DROP POLICY IF EXISTS system_insert_notifications ON public.staff_notifications;