
-- =========================
-- 1.2 Vendor extra fields
-- =========================
ALTER TABLE public.marketplace_vendors
  ADD COLUMN IF NOT EXISTS working_hours jsonb,
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS area_text text;

-- =========================
-- 1.3 Product extra fields
-- =========================
ALTER TABLE public.marketplace_products
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS is_sensitive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('approved','pending','rejected')),
  ADD COLUMN IF NOT EXISTS approval_note text;

-- Auto-flag sensitive pharmacy products for admin approval
CREATE OR REPLACE FUNCTION public.mp_enforce_product_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE vt public.marketplace_vendor_type;
BEGIN
  SELECT vendor_type INTO vt FROM public.marketplace_vendors WHERE id = NEW.vendor_id;
  IF vt = 'pharmacy' AND (NEW.is_sensitive = true OR NEW.requires_prescription = true) THEN
    -- force review unless admin sets it
    IF NOT public.is_admin() THEN
      NEW.approval_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mp_enforce_product_approval ON public.marketplace_products;
CREATE TRIGGER trg_mp_enforce_product_approval
  BEFORE INSERT OR UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.mp_enforce_product_approval();

-- =========================
-- 1.1 Auto-activate vendor account on approval
-- =========================
CREATE OR REPLACE FUNCTION public.mp_on_vendor_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Grant vendor role if missing
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.owner_user_id, 'vendor'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Mark active
    NEW.is_active := true;

    -- Notify vendor
    INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
    VALUES (
      '🎉 تم تفعيل متجرك',
      'تمت الموافقة على ' || COALESCE(NEW.store_name,'متجرك') || ' — يمكنك الآن إدارته من لوحة التحكم.',
      'vendor', NEW.owner_user_id
    );
  END IF;

  IF NEW.status IN ('rejected','suspended') AND OLD.status = 'approved' THEN
    NEW.is_active := false;
    INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
    VALUES (
      CASE NEW.status WHEN 'rejected' THEN '⚠️ تم رفض المتجر' ELSE '⏸️ تم إيقاف المتجر' END,
      COALESCE(NEW.rejected_reason, 'يرجى التواصل مع الإدارة'),
      'vendor', NEW.owner_user_id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mp_on_vendor_approved ON public.marketplace_vendors;
CREATE TRIGGER trg_mp_on_vendor_approved
  BEFORE UPDATE ON public.marketplace_vendors
  FOR EACH ROW EXECUTE FUNCTION public.mp_on_vendor_approved();

-- =========================
-- 1.4 Marketplace chats & messages
-- =========================
CREATE TABLE IF NOT EXISTS public.marketplace_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.marketplace_vendors(id) ON DELETE CASCADE,
  customer_user_id uuid NOT NULL,
  product_id uuid REFERENCES public.marketplace_products(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  unread_for_vendor int NOT NULL DEFAULT 0,
  unread_for_customer int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vendor_id, customer_user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE ON public.marketplace_chats TO authenticated;
GRANT ALL ON public.marketplace_chats TO service_role;
ALTER TABLE public.marketplace_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_chats_customer_select" ON public.marketplace_chats
  FOR SELECT TO authenticated USING (customer_user_id = auth.uid());
CREATE POLICY "mp_chats_vendor_select" ON public.marketplace_chats
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = vendor_id AND v.owner_user_id = auth.uid())
  );
CREATE POLICY "mp_chats_admin_select" ON public.marketplace_chats
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.marketplace_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.marketplace_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('customer','vendor','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.marketplace_messages TO authenticated;
GRANT ALL ON public.marketplace_messages TO service_role;
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mp_msgs_select_participant" ON public.marketplace_messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_chats c
      WHERE c.id = chat_id AND (
        c.customer_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id = c.vendor_id AND v.owner_user_id = auth.uid())
        OR public.is_admin()
      )
    )
  );

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_orders;

-- =========================
-- 1.5 RPCs
-- =========================
CREATE OR REPLACE FUNCTION public.marketplace_open_or_get_chat(_vendor_id uuid, _product_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE me uuid := auth.uid(); cid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT id INTO cid FROM public.marketplace_chats
    WHERE vendor_id=_vendor_id AND customer_user_id=me
      AND ((_product_id IS NULL AND product_id IS NULL) OR product_id = _product_id);
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO public.marketplace_chats (vendor_id, customer_user_id, product_id)
    VALUES (_vendor_id, me, _product_id) RETURNING id INTO cid;
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.marketplace_send_message(_chat_id uuid, _body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE me uuid := auth.uid(); c record; role_t text; new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF length(trim(coalesce(_body,'')))=0 THEN RETURN jsonb_build_object('success',false,'error','empty'); END IF;
  SELECT * INTO c FROM public.marketplace_chats WHERE id=_chat_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  IF c.customer_user_id = me THEN role_t := 'customer';
  ELSIF EXISTS(SELECT 1 FROM public.marketplace_vendors v WHERE v.id=c.vendor_id AND v.owner_user_id=me) THEN role_t := 'vendor';
  ELSIF public.is_admin() THEN role_t := 'admin';
  ELSE RAISE EXCEPTION 'access_denied';
  END IF;

  INSERT INTO public.marketplace_messages (chat_id, sender_id, sender_role, body)
    VALUES (_chat_id, me, role_t, trim(_body)) RETURNING id INTO new_id;

  UPDATE public.marketplace_chats
  SET last_message_at = now(),
      last_message_preview = substr(trim(_body),1,140),
      unread_for_vendor = CASE WHEN role_t='customer' THEN unread_for_vendor+1 ELSE unread_for_vendor END,
      unread_for_customer = CASE WHEN role_t='vendor' THEN unread_for_customer+1 ELSE unread_for_customer END,
      updated_at = now()
  WHERE id=_chat_id;

  -- Notify other party
  IF role_t='customer' THEN
    INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
    SELECT '💬 رسالة جديدة من عميل', substr(_body,1,120), 'vendor', v.owner_user_id
    FROM public.marketplace_vendors v WHERE v.id=c.vendor_id;
  ELSIF role_t='vendor' THEN
    INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
    VALUES ('💬 رد من المتجر', substr(_body,1,120), 'customer', c.customer_user_id);
  END IF;

  RETURN jsonb_build_object('success',true,'id',new_id);
END $$;

CREATE OR REPLACE FUNCTION public.marketplace_mark_chat_seen(_chat_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE me uuid := auth.uid();
BEGIN
  UPDATE public.marketplace_chats
  SET unread_for_customer = CASE WHEN customer_user_id=me THEN 0 ELSE unread_for_customer END,
      unread_for_vendor = CASE WHEN EXISTS(SELECT 1 FROM public.marketplace_vendors v WHERE v.id=vendor_id AND v.owner_user_id=me)
                               THEN 0 ELSE unread_for_vendor END
  WHERE id=_chat_id;
END $$;

-- Admin vendor management
CREATE OR REPLACE FUNCTION public.admin_approve_vendor(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_only'; END IF;
  UPDATE public.marketplace_vendors
    SET status='approved', approved_at=now(), approved_by=auth.uid(), rejected_reason=NULL
    WHERE id=_id;
  RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_reject_vendor(_id uuid, _reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_only'; END IF;
  UPDATE public.marketplace_vendors
    SET status='rejected', rejected_reason=_reason
    WHERE id=_id;
  RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_toggle_vendor_active(_id uuid, _active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_only'; END IF;
  UPDATE public.marketplace_vendors SET is_active=_active WHERE id=_id;
  RETURN jsonb_build_object('success',true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_product_approval(_id uuid, _status text, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF _status NOT IN ('approved','pending','rejected') THEN RAISE EXCEPTION 'bad_status'; END IF;
  UPDATE public.marketplace_products SET approval_status=_status, approval_note=_note WHERE id=_id;
  RETURN jsonb_build_object('success',true);
END $$;

-- =========================
-- 1.6 Public visibility RLS hardening for vendors/products
-- =========================
-- Replace existing "public" select policies (drop if name exists; otherwise create)
DROP POLICY IF EXISTS "mv_public_read_approved" ON public.marketplace_vendors;
CREATE POLICY "mv_public_read_approved" ON public.marketplace_vendors
  FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND COALESCE(is_active,true) = true);

DROP POLICY IF EXISTS "mp_public_read_approved" ON public.marketplace_products;
CREATE POLICY "mp_public_read_approved" ON public.marketplace_products
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND approval_status = 'approved'
    AND EXISTS (
      SELECT 1 FROM public.marketplace_vendors v
      WHERE v.id = vendor_id AND v.status='approved' AND COALESCE(v.is_active,true)=true
    )
  );
