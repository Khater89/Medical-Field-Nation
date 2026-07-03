
-- 1) mp_normalize_phone: pin search_path
CREATE OR REPLACE FUNCTION public.mp_normalize_phone(_p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN _p IS NULL THEN NULL
    ELSE right(regexp_replace(_p, '[^0-9]', '', 'g'), 9) END;
$$;

-- 2) booking_contacts: allow customer to read their own record
CREATE POLICY "Customer can view own booking contact"
ON public.booking_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_contacts.booking_id
      AND b.customer_user_id = auth.uid()
  )
);

-- 3) marketplace-chat storage: replace overly-permissive policies
DROP POLICY IF EXISTS "mp_chat_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "mp_chat_auth_read" ON storage.objects;

-- Only vendor owner (or admin) of the target chat may upload / read.
-- Guests use the mp-guest edge function which uses the service role and bypasses RLS.
-- Path convention: chats/<chat_id>/<file>
CREATE POLICY "mp_chat_participants_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'marketplace-chat'
  AND (storage.foldername(name))[1] = 'chats'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.marketplace_chats c
      JOIN public.marketplace_vendors v ON v.id = c.vendor_id
      WHERE c.id::text = (storage.foldername(name))[2]
        AND v.owner_user_id = auth.uid()
    )
  )
);

CREATE POLICY "mp_chat_participants_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'marketplace-chat'
  AND (storage.foldername(name))[1] = 'chats'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.marketplace_chats c
      JOIN public.marketplace_vendors v ON v.id = c.vendor_id
      WHERE c.id::text = (storage.foldername(name))[2]
        AND v.owner_user_id = auth.uid()
    )
  )
);

-- 4) marketplace_vendors: remove public exposure of PII
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.marketplace_vendors;
DROP POLICY IF EXISTS "mv_public_read_approved" ON public.marketplace_vendors;

-- Safe public view: only storefront-appropriate columns
CREATE OR REPLACE VIEW public.marketplace_vendors_public
WITH (security_invoker = true)
AS
SELECT
  id,
  store_name,
  store_name_en,
  slug,
  vendor_type,
  status,
  description,
  logo_url,
  banner_url,
  phone,
  whatsapp,
  city,
  area_text,
  delivery_offered,
  pickup_offered,
  accepts_cash,
  accepts_online_payment,
  rating,
  total_orders,
  working_hours,
  is_open,
  is_active,
  created_at
FROM public.marketplace_vendors
WHERE status = 'approved' AND COALESCE(is_active, true) = true;

GRANT SELECT ON public.marketplace_vendors_public TO anon, authenticated;

-- Allow authenticated chat participants to read minimal joined vendor rows via base table
-- so FK-embed queries from chat participants keep working. PII columns are still returned
-- but only to users who have an active chat/order with the vendor; anonymous access is gone.
CREATE POLICY "Chat/order participants can view vendor row"
ON public.marketplace_vendors
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND COALESCE(is_active, true) = true
  AND (
    EXISTS (
      SELECT 1 FROM public.marketplace_chats c
      WHERE c.vendor_id = marketplace_vendors.id
        AND c.customer_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      WHERE o.vendor_id = marketplace_vendors.id
        AND o.customer_user_id = auth.uid()
    )
  )
);
