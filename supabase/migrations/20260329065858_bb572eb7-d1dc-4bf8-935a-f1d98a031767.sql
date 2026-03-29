-- Allow providers to read their own notifications
CREATE POLICY "provider_read_own_notifications"
ON public.staff_notifications
FOR SELECT
TO authenticated
USING (is_provider() AND provider_id = auth.uid());

-- Allow providers to mark their own notifications as read
CREATE POLICY "provider_update_own_notifications"
ON public.staff_notifications
FOR UPDATE
TO authenticated
USING (is_provider() AND provider_id = auth.uid())
WITH CHECK (is_provider() AND provider_id = auth.uid());