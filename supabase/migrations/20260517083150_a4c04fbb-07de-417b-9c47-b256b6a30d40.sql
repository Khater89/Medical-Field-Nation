CREATE OR REPLACE FUNCTION public.create_api_key(_label text DEFAULT 'Automation Key', _scopes text[] DEFAULT ARRAY['bookings:read','status:read']::text[])
RETURNS TABLE(id uuid, plain_key text, key_prefix text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  raw := encode(gen_random_bytes(32), 'hex');
  full_key := 'mfn_' || raw;
  prefix := substr(full_key, 1, 12);
  h := encode(digest(full_key, 'sha256'), 'hex');

  SELECT email INTO me_email FROM auth.users WHERE auth.users.id = me;

  INSERT INTO public.api_keys(label, key_prefix, key_hash, scopes, created_by, created_by_email)
  VALUES (COALESCE(NULLIF(trim(_label),''), 'Automation Key'), prefix, h, _scopes, me, me_email)
  RETURNING api_keys.id INTO new_id;

  id := new_id; plain_key := full_key; key_prefix := prefix;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_api_key(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can revoke API keys';
  END IF;
  UPDATE public.api_keys SET status = 'revoked', revoked_at = now() WHERE id = _id;
END;
$$;