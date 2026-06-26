
CREATE TABLE IF NOT EXISTS public.marketplace_guest_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_norm text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_guest_otps_phone ON public.marketplace_guest_otps(phone_norm, created_at DESC);
GRANT ALL ON public.marketplace_guest_otps TO service_role;
ALTER TABLE public.marketplace_guest_otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access otps" ON public.marketplace_guest_otps FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.marketplace_guest_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  phone_norm text NOT NULL,
  customer_name text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_guest_sessions_phone ON public.marketplace_guest_sessions(phone_norm);
GRANT ALL ON public.marketplace_guest_sessions TO service_role;
ALTER TABLE public.marketplace_guest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access sessions" ON public.marketplace_guest_sessions FOR ALL USING (false) WITH CHECK (false);
