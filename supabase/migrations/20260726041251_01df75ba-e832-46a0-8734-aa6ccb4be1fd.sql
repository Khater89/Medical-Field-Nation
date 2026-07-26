CREATE POLICY "Public can view approved active vendors"
ON public.marketplace_vendors
FOR SELECT
TO anon, authenticated
USING (status = 'approved'::marketplace_vendor_status AND COALESCE(is_active, true) = true);