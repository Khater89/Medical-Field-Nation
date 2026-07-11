
-- RPC: Open or reuse a chat for the authenticated customer, keyed on (customer_user_id, vendor_id, product_id)
CREATE OR REPLACE FUNCTION public.marketplace_open_authed_chat(_vendor_id uuid, _product_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
  cust_name text;
  cust_phone text;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF NOT public.is_public_vendor(_vendor_id) THEN
    RAISE EXCEPTION 'vendor_not_available';
  END IF;

  -- Try to find an existing chat by (customer_user_id, vendor_id, product_id)
  SELECT id INTO existing_id
  FROM public.marketplace_chats
  WHERE customer_user_id = me
    AND vendor_id = _vendor_id
    AND (product_id IS NOT DISTINCT FROM _product_id)
  ORDER BY last_message_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('chat_id', existing_id, 'created', false);
  END IF;

  -- Get customer identity from profile
  SELECT COALESCE(NULLIF(TRIM(full_name), ''), 'العميل'),
         NULLIF(TRIM(phone), '')
    INTO cust_name, cust_phone
  FROM public.profiles WHERE user_id = me;

  INSERT INTO public.marketplace_chats (
    vendor_id, product_id, customer_user_id,
    customer_name, customer_phone, customer_phone_norm,
    customer_consent_at, last_message_at
  ) VALUES (
    _vendor_id, _product_id, me,
    cust_name, cust_phone,
    CASE WHEN cust_phone IS NOT NULL THEN regexp_replace(cust_phone, '\D', '', 'g') ELSE NULL END,
    now(), now()
  )
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('chat_id', new_id, 'created', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketplace_open_authed_chat(uuid, uuid) TO authenticated;

-- Add INSERT/UPDATE policies so authenticated customers can send messages directly via API
-- (existing SELECT policy already allows the customer to see their own chats)
DROP POLICY IF EXISTS mp_msgs_insert_participant ON public.marketplace_messages;
CREATE POLICY mp_msgs_insert_participant ON public.marketplace_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.marketplace_chats c
      WHERE c.id = marketplace_messages.chat_id
        AND (
          (c.customer_user_id = auth.uid() AND marketplace_messages.sender_role = 'customer')
          OR (public.user_owns_vendor(c.vendor_id) AND marketplace_messages.sender_role = 'vendor')
        )
    )
  );
