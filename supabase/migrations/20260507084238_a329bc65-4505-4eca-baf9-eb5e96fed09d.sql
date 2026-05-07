
-- 1. Restrict list_booking_messages: providers see only their own + customer messages targeted at them or untargeted
CREATE OR REPLACE FUNCTION public.list_booking_messages(_booking_id uuid)
 RETURNS TABLE(id uuid, sender_id uuid, sender_role text, sender_display_name text, body text, quoted_price numeric, target_provider_id uuid, created_at timestamp with time zone, sender_avatar text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  is_prov boolean := is_provider();
  is_cust boolean := false;
BEGIN
  IF NOT (
    is_admin() OR is_cs()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = auth.uid())
    OR (is_prov AND EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      LEFT JOIN public.services s ON s.id::text = b.service_id
      WHERE b.id = _booking_id
        AND (
          b.assigned_provider_id = auth.uid()
          OR b.reserved_provider_id = auth.uid()
          OR (b.status = 'NEW' AND (
              ((COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency = true)
              OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency = false))
              AND public.provider_role_matches_category(p.role_type, s.category)
          ))
        )
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = me)
    INTO is_cust;

  RETURN QUERY
  SELECT m.id, m.sender_id, m.sender_role,
         COALESCE(m.sender_display_name, p.full_name, 'مستخدم'),
         m.body, m.quoted_price, m.target_provider_id, m.created_at,
         p.avatar_url
  FROM public.booking_messages m
  LEFT JOIN public.profiles p ON p.user_id = m.sender_id
  WHERE m.booking_id = _booking_id
    AND (
      -- Admin/CS/customer see everything
      is_admin() OR is_cs() OR is_cust
      -- Providers: only their own messages, or customer messages addressed to them / untargeted
      OR (is_prov AND (
        m.sender_id = me
        OR (m.sender_role = 'customer' AND (m.target_provider_id IS NULL OR m.target_provider_id = me))
      ))
    )
  ORDER BY m.created_at ASC;
END;
$function$;

-- 2. Restrict booking_quotes_public: providers see only their own quote
CREATE OR REPLACE FUNCTION public.booking_quotes_public(_booking_id uuid)
 RETURNS TABLE(id uuid, provider_id uuid, provider_name text, provider_avatar text, provider_role text, quoted_price numeric, note text, created_at timestamp with time zone, is_mine boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  is_prov boolean := is_provider();
  is_cust boolean := false;
BEGIN
  IF NOT (
    is_admin() OR is_cs()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = auth.uid())
    OR (is_prov AND EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      LEFT JOIN public.services s ON s.id::text = b.service_id
      WHERE b.id = _booking_id
        AND (
          b.assigned_provider_id = auth.uid()
          OR b.reserved_provider_id = auth.uid()
          OR (b.status = 'NEW' AND (
              ((COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency = true)
              OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency = false))
              AND public.provider_role_matches_category(p.role_type, s.category)
          ))
        )
    ))
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = me)
    INTO is_cust;

  RETURN QUERY
  SELECT q.id, q.provider_id,
         COALESCE(p.full_name, 'مزود الخدمة'),
         p.avatar_url, p.role_type,
         q.quoted_price, q.note, q.created_at,
         (q.provider_id = auth.uid())
  FROM public.provider_quotes q
  LEFT JOIN public.profiles p ON p.user_id = q.provider_id
  WHERE q.booking_id = _booking_id
    AND (is_admin() OR is_cs() OR is_cust OR (is_prov AND q.provider_id = me))
  ORDER BY q.created_at ASC;
END;
$function$;

-- 3. Customer assigns a specific provider (from chat list)
CREATE OR REPLACE FUNCTION public.customer_assign_provider(_booking_id uuid, _provider_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  me uuid := auth.uid();
  b record;
  q record;
  prov record;
  cust_name text;
  updated_id uuid;
BEGIN
  SELECT id, status, assigned_provider_id, customer_user_id, booking_number, customer_display_name
    INTO b
  FROM public.bookings WHERE id = _booking_id FOR UPDATE;

  IF b.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;
  IF b.customer_user_id IS DISTINCT FROM me AND NOT (is_admin() OR is_cs()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF b.assigned_provider_id IS NOT NULL OR b.status <> 'NEW' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_assigned');
  END IF;

  -- Verify chosen provider is approved and is a provider
  SELECT p.user_id, p.full_name INTO prov
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'provider'
  WHERE p.user_id = _provider_id AND p.provider_status = 'approved';

  IF prov.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'provider_not_eligible');
  END IF;

  -- If a quote exists, use that price
  SELECT id, quoted_price INTO q FROM public.provider_quotes
  WHERE booking_id = _booking_id AND provider_id = _provider_id AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  UPDATE public.bookings
  SET status = 'ASSIGNED',
      assigned_provider_id = _provider_id,
      assigned_at = now(),
      assigned_by = 'customer',
      agreed_price = COALESCE(q.quoted_price, agreed_price)
  WHERE id = _booking_id AND status = 'NEW' AND assigned_provider_id IS NULL
  RETURNING id INTO updated_id;

  IF updated_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'race_lost');
  END IF;

  -- Mark accepted quote / reject others
  IF q.id IS NOT NULL THEN
    UPDATE public.provider_quotes SET status = 'accepted' WHERE id = q.id;
    UPDATE public.provider_quotes SET status = 'rejected'
      WHERE booking_id = _booking_id AND id <> q.id AND status = 'pending';
  END IF;

  cust_name := COALESCE(b.customer_display_name, 'العميل');

  -- History
  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (_booking_id, 'customer_assigned', me, 'customer',
          'Customer assigned provider ' || COALESCE(prov.full_name, _provider_id::text));

  -- Notify chosen provider
  INSERT INTO public.staff_notifications (title, body, target_role, provider_id, booking_id)
  VALUES (
    '🎯 تم إسناد طلب جديد لك',
    'قام العميل ' || cust_name || ' بإسناد طلب رقم ' || COALESCE(b.booking_number, '') ||
    ' إليك. يرجى مراجعة التفاصيل وقبول الطلب للمتابعة.',
    'provider', _provider_id, _booking_id
  );

  -- Notify admin
  INSERT INTO public.staff_notifications (title, body, target_role, provider_id, booking_id)
  VALUES (
    '👤 العميل أسند طلباً لمزود',
    cust_name || ' أسند الطلب ' || COALESCE(b.booking_number, '') || ' للمزود ' || COALESCE(prov.full_name, ''),
    'admin', _provider_id, _booking_id
  );

  RETURN jsonb_build_object('success', true, 'booking_id', updated_id);
END;
$function$;

-- 4. Booking interactions summary (for admin/customer eye icon)
CREATE OR REPLACE FUNCTION public.booking_interactions_summary(_booking_id uuid)
 RETURNS TABLE(provider_id uuid, full_name text, role_type text, avatar_url text, message_count integer, last_message text, last_message_at timestamp with time zone, quote_price numeric, quote_note text, quote_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (
    is_admin() OR is_cs()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH provs AS (
    SELECT DISTINCT sender_id AS pid FROM public.booking_messages
      WHERE booking_id = _booking_id AND sender_role = 'provider'
    UNION
    SELECT provider_id AS pid FROM public.provider_quotes WHERE booking_id = _booking_id
  )
  SELECT
    pr.pid,
    COALESCE(p.full_name, 'مزود'),
    p.role_type,
    p.avatar_url,
    COALESCE((SELECT COUNT(*)::int FROM public.booking_messages m
              WHERE m.booking_id = _booking_id AND m.sender_id = pr.pid AND m.sender_role='provider'), 0),
    (SELECT m.body FROM public.booking_messages m
       WHERE m.booking_id = _booking_id AND m.sender_id = pr.pid AND m.sender_role='provider'
       ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.created_at FROM public.booking_messages m
       WHERE m.booking_id = _booking_id AND m.sender_id = pr.pid AND m.sender_role='provider'
       ORDER BY m.created_at DESC LIMIT 1),
    (SELECT q.quoted_price FROM public.provider_quotes q
       WHERE q.booking_id = _booking_id AND q.provider_id = pr.pid
       ORDER BY q.created_at DESC LIMIT 1),
    (SELECT q.note FROM public.provider_quotes q
       WHERE q.booking_id = _booking_id AND q.provider_id = pr.pid
       ORDER BY q.created_at DESC LIMIT 1),
    (SELECT q.created_at FROM public.provider_quotes q
       WHERE q.booking_id = _booking_id AND q.provider_id = pr.pid
       ORDER BY q.created_at DESC LIMIT 1)
  FROM provs pr
  LEFT JOIN public.profiles p ON p.user_id = pr.pid
  ORDER BY 7 DESC NULLS LAST;
END;
$function$;
