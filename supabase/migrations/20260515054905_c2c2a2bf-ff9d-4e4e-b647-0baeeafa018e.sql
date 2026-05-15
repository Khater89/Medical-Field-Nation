CREATE OR REPLACE FUNCTION public.can_provider_message_booking(_booking_id uuid, _provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookings b
    LEFT JOIN public.profiles p ON p.user_id = _provider_id
    LEFT JOIN public.services s ON s.id::text = b.service_id
    WHERE b.id = _booking_id
      AND EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = _provider_id
          AND ur.role = 'provider'
      )
      AND (
        b.assigned_provider_id = _provider_id
        OR b.reserved_provider_id = _provider_id
        OR (
          b.status = 'NEW'
          AND b.assigned_provider_id IS NULL
          AND (
            (COALESCE(p.provider_type, 'standard') = 'emergency' AND b.is_emergency = true)
            OR (COALESCE(p.provider_type, 'standard') = 'standard' AND b.is_emergency = false)
          )
          AND public.provider_role_matches_category(p.role_type, s.category)
          AND public.gender_matches(b.required_gender, b.gender_released, p.gender)
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.send_booking_message(
  _booking_id uuid,
  _sender_role text,
  _body text,
  _quoted_price numeric DEFAULT NULL,
  _target_provider_id uuid DEFAULT NULL,
  _sender_display_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  b record;
  display_name text;
  new_message_id uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF length(trim(COALESCE(_body, ''))) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_message');
  END IF;

  SELECT id, customer_user_id, status
  INTO b
  FROM public.bookings
  WHERE id = _booking_id;

  IF b.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_found');
  END IF;

  IF _sender_role = 'customer' THEN
    IF b.customer_user_id IS DISTINCT FROM me THEN
      RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT COALESCE(NULLIF(trim(_sender_display_name), ''), NULLIF(trim(p.full_name), ''), 'العميل')
    INTO display_name
    FROM public.profiles p
    WHERE p.user_id = me;

    INSERT INTO public.booking_messages (
      booking_id, sender_id, sender_role, sender_display_name, body, target_provider_id
    ) VALUES (
      _booking_id, me, 'customer', COALESCE(display_name, 'العميل'), trim(_body), _target_provider_id
    )
    RETURNING id INTO new_message_id;

  ELSIF _sender_role = 'provider' THEN
    IF NOT public.can_provider_message_booking(_booking_id, me) THEN
      RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT COALESCE(NULLIF(trim(_sender_display_name), ''), NULLIF(trim(p.full_name), ''), 'مزود الخدمة')
    INTO display_name
    FROM public.profiles p
    WHERE p.user_id = me;

    INSERT INTO public.booking_messages (
      booking_id, sender_id, sender_role, sender_display_name, body, quoted_price, target_provider_id
    ) VALUES (
      _booking_id, me, 'provider', COALESCE(display_name, 'مزود الخدمة'), trim(_body), _quoted_price, NULL
    )
    RETURNING id INTO new_message_id;

    IF _quoted_price IS NOT NULL AND _quoted_price > 0 THEN
      INSERT INTO public.provider_quotes (booking_id, provider_id, quoted_price, note)
      VALUES (_booking_id, me, _quoted_price, trim(_body));
    END IF;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_sender_role');
  END IF;

  RETURN jsonb_build_object('success', true, 'message_id', new_message_id, 'booking_id', _booking_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_provider_message_booking(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_booking_message(uuid, text, text, numeric, uuid, text) TO authenticated;

DROP POLICY IF EXISTS provider_insert_messages ON public.booking_messages;
CREATE POLICY provider_insert_messages
ON public.booking_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = 'provider'
  AND public.can_provider_message_booking(booking_id, auth.uid())
);

DROP POLICY IF EXISTS provider_read_messages ON public.booking_messages;
CREATE POLICY provider_read_messages
ON public.booking_messages
FOR SELECT
TO authenticated
USING (
  public.can_provider_message_booking(booking_id, auth.uid())
);

DROP POLICY IF EXISTS customer_insert_messages ON public.booking_messages;
CREATE POLICY customer_insert_messages
ON public.booking_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = 'customer'
  AND EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND b.customer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS customer_read_messages ON public.booking_messages;
CREATE POLICY customer_read_messages
ON public.booking_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = booking_messages.booking_id
      AND b.customer_user_id = auth.uid()
  )
);