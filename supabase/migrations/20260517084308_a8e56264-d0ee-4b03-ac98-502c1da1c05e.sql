CREATE OR REPLACE FUNCTION public.create_api_key(_label text DEFAULT 'Automation Key'::text, _scopes text[] DEFAULT ARRAY['bookings:read'::text, 'status:read'::text])
RETURNS TABLE(id uuid, plain_key text, key_prefix text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  me uuid := auth.uid();
  me_email text;
  raw text;
  full_key text;
  prefix text;
  h text;
  new_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can create API keys';
  END IF;

  raw := encode(extensions.gen_random_bytes(32), 'hex');
  full_key := 'mfn_' || raw;
  prefix := substr(full_key, 1, 12);
  h := encode(extensions.digest(full_key, 'sha256'), 'hex');

  SELECT email INTO me_email FROM auth.users WHERE auth.users.id = me;

  INSERT INTO public.api_keys(label, key_prefix, key_hash, scopes, created_by, created_by_email)
  VALUES (COALESCE(NULLIF(trim(_label),''), 'Automation Key'), prefix, h, _scopes, me, me_email)
  RETURNING api_keys.id INTO new_id;

  id := new_id; plain_key := full_key; key_prefix := prefix;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_api_key(_plain_key text, _endpoint text DEFAULT NULL::text)
RETURNS TABLE(id uuid, scopes text[], label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  h text;
  rec record;
BEGIN
  IF _plain_key IS NULL OR length(_plain_key) < 16 THEN
    RETURN;
  END IF;
  h := encode(extensions.digest(_plain_key, 'sha256'), 'hex');

  SELECT k.id, k.scopes, k.label INTO rec
  FROM public.api_keys k
  WHERE k.key_hash = h AND k.status = 'active'
  LIMIT 1;

  IF rec.id IS NULL THEN RETURN; END IF;

  UPDATE public.api_keys
  SET last_used_at = now(),
      usage_count = usage_count + 1,
      last_endpoint = COALESCE(_endpoint, last_endpoint)
  WHERE api_keys.id = rec.id;

  id := rec.id; scopes := rec.scopes; label := rec.label;
  RETURN NEXT;
END;
$function$;