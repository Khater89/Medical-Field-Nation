
-- 1) Overtime escalation: 8% → 10% per 15-minute segment after 60 minutes
CREATE OR REPLACE FUNCTION public.calc_escalating_price(base_price numeric, duration_minutes integer)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  extra_minutes integer;
  segments integer;
BEGIN
  IF base_price IS NULL OR duration_minutes IS NULL THEN RETURN NULL; END IF;
  IF duration_minutes <= 60 THEN RETURN base_price; END IF;

  extra_minutes := duration_minutes - 60;
  segments := CEIL(extra_minutes::numeric / 15);
  RETURN base_price + (segments * base_price * 0.10);
END;
$function$;

-- 2) Let eligible providers see all quotes on the same booking (peer transparency)
CREATE OR REPLACE FUNCTION public.booking_quotes_public(_booking_id uuid)
 RETURNS TABLE(id uuid, provider_id uuid, provider_name text, provider_avatar text, provider_role text, quoted_price numeric, note text, created_at timestamp with time zone, is_mine boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT q.id, q.provider_id,
         -- Mask other providers' names for provider viewers (privacy): show only short label
         CASE
           WHEN is_admin() OR is_cs() OR is_cust OR q.provider_id = me
             THEN COALESCE(p.full_name, 'مزود الخدمة')
           ELSE 'مزود #' || COALESCE(p.provider_number::text, substr(q.provider_id::text,1,4))
         END,
         CASE
           WHEN is_admin() OR is_cs() OR is_cust OR q.provider_id = me THEN p.avatar_url
           ELSE NULL
         END,
         p.role_type,
         q.quoted_price, q.note, q.created_at,
         (q.provider_id = auth.uid())
  FROM public.provider_quotes q
  LEFT JOIN public.profiles p ON p.user_id = q.provider_id
  WHERE q.booking_id = _booking_id
  ORDER BY q.created_at ASC;
END;
$function$;
