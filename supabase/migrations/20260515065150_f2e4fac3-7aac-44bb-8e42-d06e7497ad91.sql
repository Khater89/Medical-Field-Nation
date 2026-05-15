CREATE OR REPLACE FUNCTION public.send_booking_message(_booking_id uuid, _sender_role text, _body text, _quoted_price numeric DEFAULT NULL::numeric, _target_provider_id uuid DEFAULT NULL::uuid, _sender_display_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      INSERT INTO public.provider_quotes (booking_id, provider_id, quoted_price, note, status)
      VALUES (_booking_id, me, _quoted_price, trim(_body), 'pending')
      ON CONFLICT (booking_id, provider_id)
      DO UPDATE SET quoted_price = EXCLUDED.quoted_price,
                    note = EXCLUDED.note,
                    status = 'pending',
                    created_at = now();
    END IF;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_sender_role');
  END IF;

  RETURN jsonb_build_object('success', true, 'message_id', new_message_id, 'booking_id', _booking_id);
END;
$function$;