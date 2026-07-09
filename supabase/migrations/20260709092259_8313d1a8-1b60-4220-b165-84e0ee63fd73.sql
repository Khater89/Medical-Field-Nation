
-- Helper: is current user the owner of a given vendor (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.user_owns_vendor(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_vendors v
    WHERE v.id = _vendor_id AND v.owner_user_id = auth.uid()
  )
$$;

-- Helper: does current auth user have any chat/order with the given vendor
CREATE OR REPLACE FUNCTION public.user_has_vendor_relationship(_vendor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_chats c
    WHERE c.vendor_id = _vendor_id AND c.customer_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.marketplace_orders o
    WHERE o.vendor_id = _vendor_id AND o.customer_user_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_vendor(uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_vendor_relationship(uuid) TO authenticated, anon, service_role;

-- Rewrite the recursive vendor SELECT policy to use the helper (no cross-table subquery)
DROP POLICY IF EXISTS "Chat/order participants can view vendor row" ON public.marketplace_vendors;
CREATE POLICY "Chat/order participants can view vendor row"
ON public.marketplace_vendors
FOR SELECT
USING (
  status = 'approved'::marketplace_vendor_status
  AND COALESCE(is_active, true) = true
  AND public.user_has_vendor_relationship(id)
);

-- Rewrite chat/order/product/message policies that referenced marketplace_vendors directly,
-- to use the helper function and break the recursion cycle.
DROP POLICY IF EXISTS "mp_chats_vendor_select" ON public.marketplace_chats;
CREATE POLICY "mp_chats_vendor_select"
ON public.marketplace_chats
FOR SELECT
USING (public.user_owns_vendor(vendor_id));

DROP POLICY IF EXISTS "Vendor view own orders" ON public.marketplace_orders;
CREATE POLICY "Vendor view own orders"
ON public.marketplace_orders
FOR SELECT
USING (public.user_owns_vendor(vendor_id));

DROP POLICY IF EXISTS "Vendor update own orders" ON public.marketplace_orders;
CREATE POLICY "Vendor update own orders"
ON public.marketplace_orders
FOR UPDATE
USING (public.user_owns_vendor(vendor_id))
WITH CHECK (public.user_owns_vendor(vendor_id));

DROP POLICY IF EXISTS "Vendor can manage own products" ON public.marketplace_products;
CREATE POLICY "Vendor can manage own products"
ON public.marketplace_products
FOR ALL
USING (public.user_owns_vendor(vendor_id))
WITH CHECK (public.user_owns_vendor(vendor_id));

DROP POLICY IF EXISTS "Vendor can view own products" ON public.marketplace_products;
CREATE POLICY "Vendor can view own products"
ON public.marketplace_products
FOR SELECT
USING (public.user_owns_vendor(vendor_id));

DROP POLICY IF EXISTS "mp_msgs_select_participant" ON public.marketplace_messages;
CREATE POLICY "mp_msgs_select_participant"
ON public.marketplace_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.marketplace_chats c
    WHERE c.id = marketplace_messages.chat_id
      AND (
        c.customer_user_id = auth.uid()
        OR public.user_owns_vendor(c.vendor_id)
        OR public.is_admin()
      )
  )
);
