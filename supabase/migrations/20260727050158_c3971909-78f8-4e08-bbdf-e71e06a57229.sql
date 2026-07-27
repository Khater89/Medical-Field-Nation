
-- Remove broad public SELECT on raw vendors table
DROP POLICY IF EXISTS "Public can view approved active vendors" ON public.marketplace_vendors;
REVOKE SELECT ON public.marketplace_vendors FROM anon;

-- Ensure safe public view is accessible (invoker security so RLS on base table applies to owners/admins)
ALTER VIEW public.marketplace_vendors_public SET (security_invoker = true);
GRANT SELECT ON public.marketplace_vendors_public TO anon, authenticated;

-- Allow authenticated customers to still read the minimal storefront row from the base table when needed
-- (chat/order participants policy already covers vendor relationships; admin/CS/owner policies remain).
