-- Enable pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Automation Key',
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['bookings:read','status:read']::text[],
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_by uuid NOT NULL,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  last_endpoint text,
  usage_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON public.api_keys(status);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_api_keys ON public.api_keys
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Verify an API key (called by edge function via service role). Returns the row if valid+active.
CREATE OR REPLACE FUNCTION public.verify_api_key(_plain_key text, _endpoint text DEFAULT NULL)
RETURNS TABLE(id uuid, scopes text[], label text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h text;
  rec record;
BEGIN
  IF _plain_key IS NULL OR length(_plain_key) < 16 THEN
    RETURN;
  END IF;
  h := encode(digest(_plain_key, 'sha256'), 'hex');

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
$$;