
ALTER TABLE public.marketplace_messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

CREATE OR REPLACE FUNCTION public.marketplace_send_message(
  _chat_id uuid, _body text,
  _attachment_url text DEFAULT NULL,
  _attachment_type text DEFAULT NULL,
  _attachment_name text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE me uuid := auth.uid(); c record; role_t text; new_id uuid; preview text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF length(trim(coalesce(_body,'')))=0 AND _attachment_url IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','empty');
  END IF;
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

  INSERT INTO public.marketplace_messages (chat_id, sender_id, sender_role, body, attachment_url, attachment_type, attachment_name)
    VALUES (_chat_id, me, role_t, coalesce(trim(_body),''), _attachment_url, _attachment_type, _attachment_name)
    RETURNING id INTO new_id;

  preview := CASE WHEN _attachment_url IS NOT NULL AND length(trim(coalesce(_body,'')))=0
    THEN '📎 مرفق' ELSE substr(trim(_body),1,140) END;

  UPDATE public.marketplace_chats
  SET last_message_at = now(),
      last_message_preview = preview,
      unread_for_vendor = CASE WHEN role_t='customer' THEN unread_for_vendor+1 ELSE unread_for_vendor END,
      unread_for_customer = CASE WHEN role_t='vendor' THEN unread_for_customer+1 ELSE unread_for_customer END,
      updated_at = now()
  WHERE id=_chat_id;

  RETURN jsonb_build_object('success',true,'id',new_id);
END $function$;
