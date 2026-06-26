
-- Phase 1: Customer identification before chat + Acknowledgements (customer & vendor)

-- 1) Customer identification on marketplace_chats
ALTER TABLE public.marketplace_chats
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_consent_at timestamptz;

-- 2) Order acknowledgements
ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS customer_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_acknowledgement_text text,
  ADD COLUMN IF NOT EXISTS vendor_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS vendor_acknowledged_by uuid,
  ADD COLUMN IF NOT EXISTS vendor_acknowledgement_text text;

-- 3) RPC: identify customer for chat (must be called before sending)
CREATE OR REPLACE FUNCTION public.marketplace_set_chat_identity(
  _chat_id uuid, _name text, _phone text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); c record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF length(trim(coalesce(_name,''))) < 2 THEN RAISE EXCEPTION 'name_required'; END IF;
  IF length(trim(coalesce(_phone,''))) < 7 THEN RAISE EXCEPTION 'phone_required'; END IF;
  SELECT * INTO c FROM public.marketplace_chats WHERE id=_chat_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF c.customer_user_id <> me THEN RAISE EXCEPTION 'access_denied'; END IF;
  UPDATE public.marketplace_chats
    SET customer_name = trim(_name),
        customer_phone = trim(_phone),
        customer_consent_at = COALESCE(customer_consent_at, now()),
        updated_at = now()
    WHERE id = _chat_id;
  RETURN jsonb_build_object('success', true);
END $$;

-- 4) Wrap marketplace_send_message to enforce identity for customer sender
CREATE OR REPLACE FUNCTION public.marketplace_send_message(_chat_id uuid, _body text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); c record; role_t text; new_id uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF length(trim(coalesce(_body,'')))=0 THEN RETURN jsonb_build_object('success',false,'error','empty'); END IF;
  SELECT * INTO c FROM public.marketplace_chats WHERE id=_chat_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  IF c.customer_user_id = me THEN
    role_t := 'customer';
    IF c.customer_name IS NULL OR c.customer_phone IS NULL OR c.customer_consent_at IS NULL THEN
      RAISE EXCEPTION 'identity_required';
    END IF;
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

-- 5) Vendor acknowledgement RPC (records consent + sets order to confirmed)
CREATE OR REPLACE FUNCTION public.marketplace_vendor_accept_order(
  _order_id uuid, _acknowledgement_text text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); o record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  SELECT * INTO o FROM public.marketplace_orders WHERE id=_order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.marketplace_vendors v WHERE v.id=o.vendor_id AND v.owner_user_id=me) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  IF o.status <> 'pending' THEN RAISE EXCEPTION 'invalid_status'; END IF;
  IF length(trim(coalesce(_acknowledgement_text,''))) < 20 THEN RAISE EXCEPTION 'ack_required'; END IF;

  UPDATE public.marketplace_orders
    SET status='confirmed',
        confirmed_at=now(),
        vendor_acknowledged_at=now(),
        vendor_acknowledged_by=me,
        vendor_acknowledgement_text=_acknowledgement_text,
        updated_at=now()
    WHERE id=_order_id;

  RETURN jsonb_build_object('success', true);
END $$;
