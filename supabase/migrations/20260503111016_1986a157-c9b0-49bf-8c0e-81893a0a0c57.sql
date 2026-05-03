CREATE OR REPLACE FUNCTION public.provider_messages_inbox()
RETURNS TABLE (
  booking_id uuid,
  booking_number text,
  service_id text,
  city text,
  scheduled_at timestamptz,
  status text,
  area_public text,
  is_emergency boolean,
  client_address_text text,
  customer_display_name text,
  assigned_provider_id uuid,
  last_message_id uuid,
  last_message_body text,
  last_message_created_at timestamptz,
  last_sender_id uuid,
  last_sender_role text,
  last_sender_display_name text,
  total_count integer,
  incoming_count integer,
  is_private boolean,
  customer_avatar text,
  customer_full_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  me_type text;
BEGIN
  IF NOT is_provider() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(provider_type, 'standard') INTO me_type
  FROM public.profiles WHERE user_id = me;

  RETURN QUERY
  WITH visible_msgs AS (
    SELECT m.*
    FROM public.booking_messages m
    JOIN public.bookings b ON b.id = m.booking_id
    WHERE
      (m.target_provider_id IS NULL
       OR m.target_provider_id = me
       OR m.sender_id = me)
      AND (
        b.assigned_provider_id = me
        OR b.reserved_provider_id = me
        OR (b.status = 'NEW' AND b.assigned_provider_id IS NULL
            AND ((me_type = 'emergency' AND b.is_emergency = true)
                 OR (me_type = 'standard' AND b.is_emergency = false)))
      )
  ),
  per_booking AS (
    SELECT
      vm.booking_id AS bid,
      COUNT(*)::int AS total_count,
      COUNT(*) FILTER (WHERE vm.sender_id <> me)::int AS incoming_count,
      bool_or(vm.target_provider_id = me) AS is_private,
      MAX(vm.created_at) AS last_at
    FROM visible_msgs vm
    GROUP BY vm.booking_id
    HAVING COUNT(*) FILTER (WHERE vm.sender_id <> me) > 0
  )
  SELECT
    b.id,
    b.booking_number,
    b.service_id,
    b.city,
    b.scheduled_at,
    b.status,
    b.area_public,
    b.is_emergency,
    bc.client_address_text,
    b.customer_display_name,
    b.assigned_provider_id,
    last_m.id,
    last_m.body,
    last_m.created_at,
    last_m.sender_id,
    last_m.sender_role,
    COALESCE(last_m.sender_display_name, last_p.full_name, b.customer_display_name, 'العميل'),
    pb.total_count,
    pb.incoming_count,
    COALESCE(pb.is_private, false),
    cust_p.avatar_url,
    cust_p.full_name
  FROM per_booking pb
  JOIN public.bookings b ON b.id = pb.bid
  LEFT JOIN public.booking_contacts bc ON bc.booking_id = b.id
  LEFT JOIN LATERAL (
    SELECT vm.* FROM visible_msgs vm
    WHERE vm.booking_id = pb.bid
    ORDER BY vm.created_at DESC LIMIT 1
  ) last_m ON true
  LEFT JOIN public.profiles last_p ON last_p.user_id = last_m.sender_id
  LEFT JOIN LATERAL (
    SELECT p.avatar_url, p.full_name
    FROM visible_msgs vm
    LEFT JOIN public.profiles p ON p.user_id = vm.sender_id
    WHERE vm.booking_id = pb.bid AND vm.sender_role = 'customer'
    ORDER BY vm.created_at ASC LIMIT 1
  ) cust_p ON true
  ORDER BY pb.last_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.provider_messages_inbox() TO authenticated;