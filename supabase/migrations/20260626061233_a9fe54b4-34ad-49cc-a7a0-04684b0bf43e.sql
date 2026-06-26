
-- Public read for marketplace product images
DROP POLICY IF EXISTS "marketplace_products_public_read" ON storage.objects;
CREATE POLICY "marketplace_products_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketplace-products');

-- Vendor can upload/modify/delete files only in their own folder (vendor_id is first path segment)
DROP POLICY IF EXISTS "marketplace_products_vendor_insert" ON storage.objects;
CREATE POLICY "marketplace_products_vendor_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketplace-products'
  AND EXISTS (
    SELECT 1 FROM public.marketplace_vendors v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "marketplace_products_vendor_update" ON storage.objects;
CREATE POLICY "marketplace_products_vendor_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'marketplace-products'
  AND EXISTS (
    SELECT 1 FROM public.marketplace_vendors v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "marketplace_products_vendor_delete" ON storage.objects;
CREATE POLICY "marketplace_products_vendor_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'marketplace-products'
  AND EXISTS (
    SELECT 1 FROM public.marketplace_vendors v
    WHERE v.id::text = (storage.foldername(name))[1]
      AND v.owner_user_id = auth.uid()
  )
);
