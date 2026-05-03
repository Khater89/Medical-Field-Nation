
CREATE OR REPLACE FUNCTION public.provider_confirm_agreement(_booking_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  b record;
  prov_name text;
  prov_role text;
  updated_id uuid;
BEGIN
  IF NOT is_provider() THEN RAISE EXCEPTION 'Only providers'; END IF;

  SELECT id, status, assigned_provider_id, reserved_provider_id INTO b
  FROM public.bookings WHERE id = _booking_id FOR UPDATE;

  IF b.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF b.assigned_provider_id IS NOT NULL AND b.assigned_provider_id <> me THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_assigned');
  END IF;
  IF b.reserved_provider_id IS NOT NULL AND b.reserved_provider_id <> me THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_reserved_by_you');
  END IF;

  UPDATE public.bookings
  SET status = 'ACCEPTED',
      assigned_provider_id = me,
      reserved_provider_id = me,
      assigned_at = COALESCE(assigned_at, now()),
      accepted_at = now(),
      assigned_by = COALESCE(assigned_by, 'self')
  WHERE id = _booking_id
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'update_failed'); END IF;

  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (_booking_id, 'agreement_signed', me, 'provider', 'Provider signed agreement and accepted');

  -- Auto-message to customer in booking chat
  SELECT full_name, role_type INTO prov_name, prov_role FROM public.profiles WHERE user_id = me;
  INSERT INTO public.booking_messages (booking_id, sender_id, sender_role, sender_display_name, body)
  VALUES (
    _booking_id, me, 'provider',
    COALESCE(prov_name, 'مقدم الخدمة'),
    '✅ مرحباً، لقد قبلت طلبك وسأكون في خدمتك في الموعد المحدد. يمكنك التواصل معي مباشرة من هنا أو الاتصال هاتفياً.'
  );

  -- Notify admin
  INSERT INTO public.staff_notifications (title, body, target_role, provider_id, booking_id)
  VALUES (
    '✅ مزود قبل طلباً عبر السوق',
    COALESCE(prov_name, 'مزود') || ' قبل الطلب',
    'admin', me, _booking_id
  );

  RETURN jsonb_build_object('success', true, 'booking_id', updated_id);
END;
$function$;
