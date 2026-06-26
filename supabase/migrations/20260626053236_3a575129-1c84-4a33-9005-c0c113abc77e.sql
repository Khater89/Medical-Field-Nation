
-- ============== Enums (independent of role) ==============
DO $$ BEGIN
  CREATE TYPE public.marketplace_vendor_type AS ENUM ('pharmacy','medical_devices','prosthetics','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_vendor_status AS ENUM ('pending','approved','suspended','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_order_status AS ENUM (
    'NEW','CONFIRMED','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_payment_method AS ENUM ('CASH_ON_DELIVERY','ONLINE','CLIQ');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_payment_status AS ENUM ('UNPAID','PAID','REFUNDED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_delivery_method AS ENUM ('VENDOR_DELIVERY','PICKUP','SHIPPING_COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public'
AS $$ SELECT public.has_role(auth.uid(), 'vendor'::public.app_role) $$;

CREATE SEQUENCE IF NOT EXISTS public.marketplace_vendor_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.marketplace_order_seq START 1;

-- ============== 1) marketplace_vendors ==============
CREATE TABLE IF NOT EXISTS public.marketplace_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_number bigint UNIQUE,
  store_name text NOT NULL,
  store_name_en text,
  slug text UNIQUE,
  vendor_type public.marketplace_vendor_type NOT NULL,
  status public.marketplace_vendor_status NOT NULL DEFAULT 'pending',
  description text,
  logo_url text,
  banner_url text,
  phone text,
  email text,
  whatsapp text,
  city text,
  address_text text,
  lat numeric,
  lng numeric,
  license_number text,
  license_file_url text,
  commercial_registration text,
  delivery_offered boolean NOT NULL DEFAULT true,
  pickup_offered boolean NOT NULL DEFAULT false,
  accepts_cash boolean NOT NULL DEFAULT true,
  accepts_online_payment boolean NOT NULL DEFAULT false,
  rating numeric DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  approved_at timestamptz,
  approved_by uuid,
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mv_owner ON public.marketplace_vendors(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_mv_status ON public.marketplace_vendors(status);
CREATE INDEX IF NOT EXISTS idx_mv_type ON public.marketplace_vendors(vendor_type);

GRANT SELECT ON public.marketplace_vendors TO anon;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_vendors TO authenticated;
GRANT ALL ON public.marketplace_vendors TO service_role;

ALTER TABLE public.marketplace_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved vendors" ON public.marketplace_vendors
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Owner can view own vendor" ON public.marketplace_vendors
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid());
CREATE POLICY "Admin/CS full read vendors" ON public.marketplace_vendors
  FOR SELECT TO authenticated USING (public.is_admin() OR public.is_cs());
CREATE POLICY "Authenticated can create vendor application" ON public.marketplace_vendors
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Owner can update own vendor" ON public.marketplace_vendors
  FOR UPDATE TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Admin can update any vendor" ON public.marketplace_vendors
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin can delete vendors" ON public.marketplace_vendors
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.mv_prevent_privileged_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.vendor_number IS DISTINCT FROM OLD.vendor_number
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged vendor fields' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_mv_prevent_privileged ON public.marketplace_vendors;
CREATE TRIGGER trg_mv_prevent_privileged BEFORE UPDATE ON public.marketplace_vendors
  FOR EACH ROW EXECUTE FUNCTION public.mv_prevent_privileged_changes();

CREATE OR REPLACE FUNCTION public.mv_assign_number()
RETURNS trigger LANGUAGE plpgsql SET search_path='public' AS $$
BEGIN
  IF NEW.vendor_number IS NULL AND NEW.status = 'approved' THEN
    NEW.vendor_number := nextval('public.marketplace_vendor_seq');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_mv_assign_number ON public.marketplace_vendors;
CREATE TRIGGER trg_mv_assign_number BEFORE INSERT OR UPDATE ON public.marketplace_vendors
  FOR EACH ROW EXECUTE FUNCTION public.mv_assign_number();

DROP TRIGGER IF EXISTS trg_mv_updated ON public.marketplace_vendors;
CREATE TRIGGER trg_mv_updated BEFORE UPDATE ON public.marketplace_vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== 2) marketplace_categories ==============
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  parent_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  vendor_type public.marketplace_vendor_type,
  icon text,
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mc_parent ON public.marketplace_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_mc_vtype ON public.marketplace_categories(vendor_type);

GRANT SELECT ON public.marketplace_categories TO anon;
GRANT SELECT ON public.marketplace_categories TO authenticated;
GRANT ALL ON public.marketplace_categories TO service_role;

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active categories" ON public.marketplace_categories
  FOR SELECT TO anon, authenticated USING (is_active = true OR public.is_admin() OR public.is_cs());
CREATE POLICY "Admin can manage categories" ON public.marketplace_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_mc_updated ON public.marketplace_categories;
CREATE TRIGGER trg_mc_updated BEFORE UPDATE ON public.marketplace_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== 3) marketplace_products ==============
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  sku text,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  brand text,
  price numeric NOT NULL CHECK (price >= 0),
  compare_at_price numeric CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  currency text NOT NULL DEFAULT 'JOD',
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  unlimited_stock boolean NOT NULL DEFAULT false,
  unit text,
  cover_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  requires_prescription boolean NOT NULL DEFAULT false,
  tags text[] DEFAULT '{}',
  views_count integer NOT NULL DEFAULT 0,
  sales_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_vendor ON public.marketplace_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mp_category ON public.marketplace_products(category_id);
CREATE INDEX IF NOT EXISTS idx_mp_active ON public.marketplace_products(is_active);

GRANT SELECT ON public.marketplace_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_products TO authenticated;
GRANT ALL ON public.marketplace_products TO service_role;

ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view products of approved vendors" ON public.marketplace_products
  FOR SELECT TO anon, authenticated USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.marketplace_vendors v
      WHERE v.id = vendor_id AND v.status = 'approved'
    )
  );
CREATE POLICY "Vendor can view own products" ON public.marketplace_products
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );
CREATE POLICY "Admin/CS can view all products" ON public.marketplace_products
  FOR SELECT TO authenticated USING (public.is_admin() OR public.is_cs());
CREATE POLICY "Vendor can manage own products" ON public.marketplace_products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid() AND v.status IN ('approved','pending')));
CREATE POLICY "Admin can manage all products" ON public.marketplace_products
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_mp_updated ON public.marketplace_products;
CREATE TRIGGER trg_mp_updated BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== 4) marketplace_product_images ==============
CREATE TABLE IF NOT EXISTS public.marketplace_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mpi_product ON public.marketplace_product_images(product_id);

GRANT SELECT ON public.marketplace_product_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_product_images TO authenticated;
GRANT ALL ON public.marketplace_product_images TO service_role;

ALTER TABLE public.marketplace_product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view images of viewable products" ON public.marketplace_product_images
  FOR SELECT TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_products p
      JOIN public.marketplace_vendors v ON v.id = p.vendor_id
      WHERE p.id = product_id AND p.is_active = true AND v.status='approved'
    )
  );
CREATE POLICY "Vendor manage own product images" ON public.marketplace_product_images
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_products p
      JOIN public.marketplace_vendors v ON v.id = p.vendor_id
      WHERE p.id = product_id AND v.owner_user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_products p
      JOIN public.marketplace_vendors v ON v.id = p.vendor_id
      WHERE p.id = product_id AND v.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "Admin manage all product images" ON public.marketplace_product_images
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============== 5) marketplace_orders ==============
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors(id) ON DELETE RESTRICT,
  status public.marketplace_order_status NOT NULL DEFAULT 'NEW',
  payment_method public.marketplace_payment_method NOT NULL,
  payment_status public.marketplace_payment_status NOT NULL DEFAULT 'UNPAID',
  delivery_method public.marketplace_delivery_method NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  delivery_fee numeric NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  discount numeric NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  platform_fee_percent numeric NOT NULL DEFAULT 0,
  platform_fee_amount numeric NOT NULL DEFAULT 0,
  vendor_payout numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'JOD',
  customer_name text,
  customer_phone text,
  customer_email text,
  delivery_address text,
  delivery_city text,
  delivery_lat numeric,
  delivery_lng numeric,
  notes text,
  internal_note text,
  confirmed_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mo_customer ON public.marketplace_orders(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_mo_vendor ON public.marketplace_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_mo_status ON public.marketplace_orders(status);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_orders TO authenticated;
GRANT ALL ON public.marketplace_orders TO service_role;

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer view own orders" ON public.marketplace_orders
  FOR SELECT TO authenticated USING (customer_user_id = auth.uid());
CREATE POLICY "Vendor view own orders" ON public.marketplace_orders
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );
CREATE POLICY "Admin/CS view all orders" ON public.marketplace_orders
  FOR SELECT TO authenticated USING (public.is_admin() OR public.is_cs());
CREATE POLICY "Customer create own orders" ON public.marketplace_orders
  FOR INSERT TO authenticated WITH CHECK (customer_user_id = auth.uid());
CREATE POLICY "Vendor update own orders" ON public.marketplace_orders
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );
CREATE POLICY "Admin/CS update all orders" ON public.marketplace_orders
  FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_cs());

CREATE OR REPLACE FUNCTION public.mo_generate_order_number()
RETURNS trigger LANGUAGE plpgsql SET search_path='public' AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'MKT-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(nextval('public.marketplace_order_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_mo_number ON public.marketplace_orders;
CREATE TRIGGER trg_mo_number BEFORE INSERT ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.mo_generate_order_number();
DROP TRIGGER IF EXISTS trg_mo_updated ON public.marketplace_orders;
CREATE TRIGGER trg_mo_updated BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== 6) marketplace_order_items ==============
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total numeric NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_moi_order ON public.marketplace_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_moi_product ON public.marketplace_order_items(product_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_order_items TO authenticated;
GRANT ALL ON public.marketplace_order_items TO service_role;

ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View items via order access" ON public.marketplace_order_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_orders o
      LEFT JOIN public.marketplace_vendors v ON v.id = o.vendor_id
      WHERE o.id = order_id AND (
        o.customer_user_id = auth.uid()
        OR v.owner_user_id = auth.uid()
        OR public.is_admin() OR public.is_cs()
      )
    )
  );
CREATE POLICY "Customer insert items into own order" ON public.marketplace_order_items
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.marketplace_orders o WHERE o.id = order_id AND o.customer_user_id = auth.uid())
  );
CREATE POLICY "Admin manage all order items" ON public.marketplace_order_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============== 7) marketplace_vendor_ledger ==============
CREATE TABLE IF NOT EXISTS public.marketplace_vendor_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.marketplace_orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mvl_vendor ON public.marketplace_vendor_ledger(vendor_id);

GRANT SELECT ON public.marketplace_vendor_ledger TO authenticated;
GRANT ALL ON public.marketplace_vendor_ledger TO service_role;

ALTER TABLE public.marketplace_vendor_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor view own ledger" ON public.marketplace_vendor_ledger
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );
CREATE POLICY "Admin/CS view all ledger" ON public.marketplace_vendor_ledger
  FOR SELECT TO authenticated USING (public.is_admin() OR public.is_cs());

-- ============== 8) marketplace_settlement_requests ==============
CREATE TABLE IF NOT EXISTS public.marketplace_settlement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'PENDING',
  requested_by uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  paid_by uuid,
  paid_at timestamptz,
  payment_reference text,
  finance_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msr_vendor ON public.marketplace_settlement_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_msr_status ON public.marketplace_settlement_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_settlement_requests TO authenticated;
GRANT ALL ON public.marketplace_settlement_requests TO service_role;

ALTER TABLE public.marketplace_settlement_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vendor view own settlements" ON public.marketplace_settlement_requests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );
CREATE POLICY "Admin/CS view all settlements" ON public.marketplace_settlement_requests
  FOR SELECT TO authenticated USING (public.is_admin() OR public.is_cs());
CREATE POLICY "Vendor create own settlement" ON public.marketplace_settlement_requests
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
    AND requested_by = auth.uid()
  );
CREATE POLICY "Admin update settlements" ON public.marketplace_settlement_requests
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_msr_updated ON public.marketplace_settlement_requests;
CREATE TRIGGER trg_msr_updated BEFORE UPDATE ON public.marketplace_settlement_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============== 9) Helper: vendor balance ==============
CREATE OR REPLACE FUNCTION public.get_marketplace_vendor_balance(_vendor_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public'
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.marketplace_vendor_ledger
  WHERE vendor_id = _vendor_id
$$;
