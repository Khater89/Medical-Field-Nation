
-- Helper: is a vendor publicly listable? (approved + active)
CREATE OR REPLACE FUNCTION public.is_public_vendor(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_vendors v
    WHERE v.id = _vendor_id
      AND v.status = 'approved'::marketplace_vendor_status
      AND COALESCE(v.is_active, true) = true
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_public_vendor(uuid) TO anon, authenticated;

-- Revert the public view back to SECURITY DEFINER semantics so it can bypass
-- base-table RLS and safely expose ONLY the non-sensitive columns it selects.
-- The base table keeps sensitive columns (email, license, owner_user_id, etc.)
-- protected by RLS.
ALTER VIEW public.marketplace_vendors_public SET (security_invoker = false);

-- Fix products visibility: replace EXISTS(marketplace_vendors) subquery
-- (which is subject to caller RLS) with the SECURITY DEFINER helper.
DROP POLICY IF EXISTS "Public can view products of approved vendors" ON public.marketplace_products;
DROP POLICY IF EXISTS "mp_public_read_approved" ON public.marketplace_products;

CREATE POLICY "Public can view active products of approved vendors"
ON public.marketplace_products
FOR SELECT
TO anon, authenticated
USING (
  is_active = true
  AND COALESCE(approval_status, 'approved') = 'approved'
  AND public.is_public_vendor(vendor_id)
);
