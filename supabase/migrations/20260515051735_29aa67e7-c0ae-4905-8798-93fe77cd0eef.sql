
-- 1) Add gender to profiles (provider gender) and required_gender to bookings
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_chk CHECK (gender IS NULL OR gender IN ('male','female'));

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS required_gender text;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_required_gender_chk CHECK (required_gender IS NULL OR required_gender IN ('male','female','any'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gender_released boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gender_released_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gender_released_by uuid;

-- 2) Helper: gender_matches
CREATE OR REPLACE FUNCTION public.gender_matches(_required text, _released boolean, _provider_gender text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT
    CASE
      WHEN _released = true THEN true
      WHEN _required IS NULL OR _required = 'any' THEN true
      WHEN _provider_gender IS NULL THEN false
      ELSE _required = _provider_gender
    END
$$;

-- 3) admin_release_gender RPC
CREATE OR REPLACE FUNCTION public.admin_release_gender(_booking_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); admin_name text;
BEGIN
  IF NOT (is_admin() OR is_cs()) THEN RAISE EXCEPTION 'Access denied'; END IF;
  UPDATE public.bookings
  SET gender_released = true, gender_released_at = now(), gender_released_by = me
  WHERE id = _booking_id;

  SELECT full_name INTO admin_name FROM public.profiles WHERE user_id = me;
  INSERT INTO public.booking_history (booking_id, action, performed_by, performer_role, note)
  VALUES (_booking_id, 'gender_released', me,
          CASE WHEN is_admin() THEN 'admin' ELSE 'cs' END,
          'تم تحرير شرط الجنس بواسطة ' || COALESCE(admin_name, 'الإدارة'));

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4) Update available_bookings_for_providers to honor gender filter
CREATE OR REPLACE FUNCTION public.available_bookings_for_providers()
RETURNS TABLE(id uuid, service_id text, city text, scheduled_at timestamptz, booking_number text,
              area_public text, notes text, created_at timestamptz, payment_method text,
              is_emergency boolean, distance_km numeric, base_price numeric, service_name text,
              viewer_count integer, quote_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me_lat numeric; me_lng numeric; me_type text; me_role text; me_gender text;
BEGIN
  IF NOT is_provider() THEN RETURN; END IF;
  SELECT p.lat, p.lng, COALESCE(p.provider_type, 'standard'), p.role_type, p.gender
    INTO me_lat, me_lng, me_type, me_role, me_gender
  FROM public.profiles p WHERE p.user_id = auth.uid();

  RETURN QUERY
  SELECT b.id, b.service_id, b.city, b.scheduled_at, b.booking_number,
         b.area_public, b.notes, b.created_at, b.payment_method, b.is_emergency,
         public.haversine_distance(me_lat, me_lng, b.client_lat, b.client_lng),
         s.base_price, COALESCE(s.name, b.service_id),
         (SELECT COUNT(DISTINCT sender_id)::int FROM public.booking_messages bm
            WHERE bm.booking_id = b.id AND bm.sender_role='provider'),
         (SELECT COUNT(*)::int FROM public.provider_quotes pq WHERE pq.booking_id = b.id)
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id::text = b.service_id
  WHERE b.status='NEW' AND b.assigned_provider_id IS NULL
    AND ((me_type='emergency' AND b.is_emergency=true) OR (me_type='standard' AND b.is_emergency=false))
    AND public.provider_role_matches_category(me_role, s.category)
    AND public.gender_matches(b.required_gender, b.gender_released, me_gender)
  ORDER BY b.is_emergency DESC, b.created_at DESC;
END;
$$;

-- 5) Update provider_messages_inbox to honor gender filter on NEW bookings
CREATE OR REPLACE FUNCTION public.provider_messages_inbox()
RETURNS TABLE(booking_id uuid, booking_number text, service_id text, city text, scheduled_at timestamptz,
              status text, area_public text, is_emergency boolean, client_address_text text,
              customer_display_name text, assigned_provider_id uuid, last_message_id uuid,
              last_message_body text, last_message_created_at timestamptz, last_sender_id uuid,
              last_sender_role text, last_sender_display_name text, total_count integer,
              incoming_count integer, is_private boolean, customer_avatar text, customer_full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); me_type text; me_role text; me_gender text;
BEGIN
  IF NOT is_provider() THEN RAISE EXCEPTION 'Access denied'; END IF;
  SELECT COALESCE(provider_type,'standard'), role_type, gender
    INTO me_type, me_role, me_gender FROM public.profiles WHERE user_id = me;

  RETURN QUERY
  WITH visible_msgs AS (
    SELECT m.* FROM public.booking_messages m
    JOIN public.bookings b ON b.id = m.booking_id
    LEFT JOIN public.services s ON s.id::text = b.service_id
    WHERE (m.target_provider_id IS NULL OR m.target_provider_id = me OR m.sender_id = me)
      AND ( b.assigned_provider_id = me OR b.reserved_provider_id = me
        OR ( b.status='NEW' AND b.assigned_provider_id IS NULL
            AND ((me_type='emergency' AND b.is_emergency=true) OR (me_type='standard' AND b.is_emergency=false))
            AND public.provider_role_matches_category(me_role, s.category)
            AND public.gender_matches(b.required_gender, b.gender_released, me_gender)
        )
      )
  ),
  per_booking AS (
    SELECT vm.booking_id AS bid, COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE vm.sender_id <> me)::int AS incoming_count,
      bool_or(vm.target_provider_id = me) AS is_private,
      MAX(vm.created_at) AS last_at
    FROM visible_msgs vm GROUP BY vm.booking_id
    HAVING COUNT(*) FILTER (WHERE vm.sender_id <> me) > 0
  )
  SELECT b.id, b.booking_number, b.service_id, b.city, b.scheduled_at, b.status,
    b.area_public, b.is_emergency, bc.client_address_text, b.customer_display_name,
    b.assigned_provider_id, last_m.id, last_m.body, last_m.created_at, last_m.sender_id,
    last_m.sender_role, COALESCE(last_m.sender_display_name, last_p.full_name, b.customer_display_name, 'العميل'),
    pb.total_count, pb.incoming_count, COALESCE(pb.is_private, false), cust_p.avatar_url, cust_p.full_name
  FROM per_booking pb
  JOIN public.bookings b ON b.id = pb.bid
  LEFT JOIN public.booking_contacts bc ON bc.booking_id = b.id
  LEFT JOIN LATERAL (SELECT vm.* FROM visible_msgs vm WHERE vm.booking_id = pb.bid
                     ORDER BY vm.created_at DESC LIMIT 1) last_m ON true
  LEFT JOIN public.profiles last_p ON last_p.user_id = last_m.sender_id
  LEFT JOIN LATERAL (SELECT p.avatar_url, p.full_name FROM visible_msgs vm
                     LEFT JOIN public.profiles p ON p.user_id = vm.sender_id
                     WHERE vm.booking_id = pb.bid AND vm.sender_role='customer'
                     ORDER BY vm.created_at ASC LIMIT 1) cust_p ON true
  ORDER BY pb.last_at DESC;
END;
$$;

-- 6) Update list_booking_messages and booking_quotes_public to honor gender
CREATE OR REPLACE FUNCTION public.list_booking_messages(_booking_id uuid)
RETURNS TABLE(id uuid, sender_id uuid, sender_role text, sender_display_name text,
              body text, quoted_price numeric, target_provider_id uuid, created_at timestamptz, sender_avatar text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); is_prov boolean := is_provider(); is_cust boolean := false;
BEGIN
  IF NOT (
    is_admin() OR is_cs()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = auth.uid())
    OR (is_prov AND EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      LEFT JOIN public.services s ON s.id::text = b.service_id
      WHERE b.id = _booking_id
        AND ( b.assigned_provider_id = auth.uid() OR b.reserved_provider_id = auth.uid()
          OR ( b.status='NEW' AND (
              ((COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency=true)
              OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency=false))
              AND public.provider_role_matches_category(p.role_type, s.category)
              AND public.gender_matches(b.required_gender, b.gender_released, p.gender)
          ))
        )
    ))
  ) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = me)
    INTO is_cust;

  RETURN QUERY
  SELECT m.id, m.sender_id, m.sender_role,
         COALESCE(m.sender_display_name, p.full_name, 'مستخدم'),
         m.body, m.quoted_price, m.target_provider_id, m.created_at, p.avatar_url
  FROM public.booking_messages m
  LEFT JOIN public.profiles p ON p.user_id = m.sender_id
  WHERE m.booking_id = _booking_id
    AND ( is_admin() OR is_cs() OR is_cust
      OR (is_prov AND ( m.sender_id = me
        OR (m.sender_role='customer' AND (m.target_provider_id IS NULL OR m.target_provider_id = me)) )) )
  ORDER BY m.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_quotes_public(_booking_id uuid)
RETURNS TABLE(id uuid, provider_id uuid, provider_name text, provider_avatar text,
              provider_role text, quoted_price numeric, note text, created_at timestamptz, is_mine boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := auth.uid(); is_prov boolean := is_provider(); is_cust boolean := false;
BEGIN
  IF NOT (
    is_admin() OR is_cs()
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = auth.uid())
    OR (is_prov AND EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.profiles p ON p.user_id = auth.uid()
      LEFT JOIN public.services s ON s.id::text = b.service_id
      WHERE b.id = _booking_id
        AND ( b.assigned_provider_id = auth.uid() OR b.reserved_provider_id = auth.uid()
          OR ( b.status='NEW' AND (
              ((COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency=true)
              OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency=false))
              AND public.provider_role_matches_category(p.role_type, s.category)
              AND public.gender_matches(b.required_gender, b.gender_released, p.gender)
          ))
        )
    ))
  ) THEN RAISE EXCEPTION 'Access denied'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = _booking_id AND b.customer_user_id = me)
    INTO is_cust;

  RETURN QUERY
  SELECT q.id, q.provider_id, COALESCE(p.full_name, 'مزود الخدمة'),
         p.avatar_url, p.role_type, q.quoted_price, q.note, q.created_at,
         (q.provider_id = auth.uid())
  FROM public.provider_quotes q
  LEFT JOIN public.profiles p ON p.user_id = q.provider_id
  WHERE q.booking_id = _booking_id
    AND (is_admin() OR is_cs() OR is_cust OR (is_prov AND q.provider_id = me))
  ORDER BY q.created_at ASC;
END;
$$;

-- 7) Update RLS on booking_messages: include gender_matches in NEW-broadcast access
DROP POLICY IF EXISTS provider_insert_messages ON public.booking_messages;
CREATE POLICY provider_insert_messages ON public.booking_messages FOR INSERT
WITH CHECK (
  (sender_id = auth.uid()) AND (sender_role = 'provider') AND is_provider()
  AND EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.profiles p ON p.user_id = auth.uid()
    LEFT JOIN public.services s ON s.id::text = b.service_id
    WHERE b.id = booking_messages.booking_id
      AND ( b.assigned_provider_id = auth.uid() OR b.reserved_provider_id = auth.uid()
        OR ( b.status='NEW' AND b.assigned_provider_id IS NULL
            AND ( ((COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency=true)
                OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency=false)) )
            AND public.gender_matches(b.required_gender, b.gender_released, p.gender)
        )
      )
  )
);

DROP POLICY IF EXISTS provider_read_messages ON public.booking_messages;
CREATE POLICY provider_read_messages ON public.booking_messages FOR SELECT
USING (
  is_provider() AND EXISTS (
    SELECT 1 FROM public.bookings b
    LEFT JOIN public.profiles p ON p.user_id = auth.uid()
    LEFT JOIN public.services s ON s.id::text = b.service_id
    WHERE b.id = booking_messages.booking_id
      AND ( b.assigned_provider_id = auth.uid() OR b.reserved_provider_id = auth.uid()
        OR ( b.status='NEW' AND b.assigned_provider_id IS NULL
            AND ( ((COALESCE(p.provider_type,'standard')='emergency' AND b.is_emergency=true)
                OR (COALESCE(p.provider_type,'standard')='standard' AND b.is_emergency=false)) )
            AND public.gender_matches(b.required_gender, b.gender_released, p.gender)
        )
      )
  )
);
