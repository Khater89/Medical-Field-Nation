
-- 1) booking_contacts: provider SELECT scoped to ACCEPTED bookings with reveal allowed
DROP POLICY IF EXISTS "Providers can read contacts after acceptance" ON public.booking_contacts;
CREATE POLICY "Providers can read contacts after acceptance"
ON public.booking_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_contacts.booking_id
      AND b.assigned_provider_id = auth.uid()
      AND b.status IN ('ACCEPTED','IN_PROGRESS','PROVIDER_ON_THE_WAY','COMPLETED')
      AND COALESCE(b.reveal_contact_allowed, false) = true
  )
);

-- 2) provider-licenses storage UPDATE policy
DROP POLICY IF EXISTS "Providers can update their own license files" ON storage.objects;
CREATE POLICY "Providers can update their own license files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'provider-licenses'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'provider-licenses'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) provider_settlement_requests INSERT policy for providers
DROP POLICY IF EXISTS "Providers can insert their own settlement requests" ON public.provider_settlement_requests;
CREATE POLICY "Providers can insert their own settlement requests"
ON public.provider_settlement_requests
FOR INSERT
TO authenticated
WITH CHECK (
  provider_id = auth.uid() AND public.is_provider()
);
