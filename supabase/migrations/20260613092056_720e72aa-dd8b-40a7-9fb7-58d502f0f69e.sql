
-- 1) Table
CREATE TABLE IF NOT EXISTS public.provider_settlement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','REJECTED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  requested_by uuid NOT NULL,
  reviewed_at timestamptz,
  reviewed_by uuid,
  paid_at timestamptz,
  paid_by uuid,
  payment_reference text,
  finance_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psr_provider ON public.provider_settlement_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_psr_status ON public.provider_settlement_requests(status);

-- One pending request per provider
CREATE UNIQUE INDEX IF NOT EXISTS uq_psr_one_pending_per_provider
  ON public.provider_settlement_requests(provider_id) WHERE status = 'PENDING';

GRANT SELECT, INSERT, UPDATE ON public.provider_settlement_requests TO authenticated;
GRANT ALL ON public.provider_settlement_requests TO service_role;

ALTER TABLE public.provider_settlement_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers view own settlement requests" ON public.provider_settlement_requests;
CREATE POLICY "Providers view own settlement requests" ON public.provider_settlement_requests
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR public.is_admin() OR public.is_cs());

DROP POLICY IF EXISTS "Admin can update settlement requests" ON public.provider_settlement_requests;
CREATE POLICY "Admin can update settlement requests" ON public.provider_settlement_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Inserts only via RPC (service definer), so block direct insert via RLS by not adding INSERT policy.

-- 2) Allow new ledger reasons through the validator
CREATE OR REPLACE FUNCTION public.validate_wallet_ledger_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.reason = 'settlement' THEN
    IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Settlement amount must be positive'; END IF;
    IF NEW.amount > 50000 THEN RAISE EXCEPTION 'Settlement amount exceeds maximum allowed (50,000)'; END IF;
  END IF;
  IF NEW.reason = 'settlement_request' AND NEW.amount >= 0 THEN
    RAISE EXCEPTION 'settlement_request must be negative (debit reserving available balance)';
  END IF;
  IF NEW.reason = 'settlement_request_cancelled' AND NEW.amount <= 0 THEN
    RAISE EXCEPTION 'settlement_request_cancelled must be positive (reversal)';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) RPC: provider requests settlement of their positive balance
CREATE OR REPLACE FUNCTION public.provider_request_settlement()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  bal numeric;
  amt numeric;
  pending_exists boolean;
  new_id uuid;
  prov_name text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF NOT public.is_provider() THEN RAISE EXCEPTION 'providers_only'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.provider_settlement_requests
    WHERE provider_id = me AND status = 'PENDING'
  ) INTO pending_exists;
  IF pending_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'pending_exists');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO bal
  FROM public.provider_wallet_ledger WHERE provider_id = me;

  amt := ROUND(bal::numeric, 2);
  IF amt <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_balance');
  END IF;

  INSERT INTO public.provider_settlement_requests (provider_id, amount, requested_by)
  VALUES (me, amt, me)
  RETURNING id INTO new_id;

  -- Lock the amount: debit ledger
  INSERT INTO public.provider_wallet_ledger (provider_id, amount, reason)
  VALUES (me, -amt, 'settlement_request');

  SELECT full_name INTO prov_name FROM public.profiles WHERE user_id = me;

  INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
  VALUES (
    '💸 طلب تسوية جديد',
    COALESCE(prov_name, 'مزود') || ' طلب تسوية مبلغ ' || amt::text || ' د.أ',
    'admin', me
  );

  RETURN jsonb_build_object('success', true, 'id', new_id, 'amount', amt);
END;
$$;

-- 4) RPC: admin marks settlement paid
CREATE OR REPLACE FUNCTION public.admin_mark_settlement_paid(
  _id uuid, _payment_reference text, _finance_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_only'; END IF;
  IF _payment_reference IS NULL OR length(trim(_payment_reference)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'reference_required');
  END IF;

  SELECT * INTO r FROM public.provider_settlement_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF r.status <> 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_pending');
  END IF;

  UPDATE public.provider_settlement_requests
  SET status = 'PAID',
      paid_at = now(), paid_by = me,
      reviewed_at = now(), reviewed_by = me,
      payment_reference = trim(_payment_reference),
      finance_note = NULLIF(trim(COALESCE(_finance_note,'')), ''),
      updated_at = now()
  WHERE id = _id;

  INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
  VALUES (
    '✅ تمت تسوية مستحقاتك',
    'تمت تسوية ' || r.amount::text || ' د.أ — مرجع: ' || trim(_payment_reference),
    'provider', r.provider_id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5) RPC: admin rejects a settlement (reverses the lock)
CREATE OR REPLACE FUNCTION public.admin_reject_settlement(
  _id uuid, _finance_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  me uuid := auth.uid();
  r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin_only'; END IF;

  SELECT * INTO r FROM public.provider_settlement_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF r.status <> 'PENDING' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_pending');
  END IF;

  UPDATE public.provider_settlement_requests
  SET status = 'REJECTED',
      reviewed_at = now(), reviewed_by = me,
      finance_note = NULLIF(trim(COALESCE(_finance_note,'')), ''),
      updated_at = now()
  WHERE id = _id;

  -- Reverse the lock
  INSERT INTO public.provider_wallet_ledger (provider_id, amount, reason)
  VALUES (r.provider_id, r.amount, 'settlement_request_cancelled');

  INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
  VALUES (
    '⚠️ تم رفض طلب التسوية',
    'تم رفض طلب تسوية بمبلغ ' || r.amount::text || ' د.أ' ||
    COALESCE(' — ' || NULLIF(trim(COALESCE(_finance_note,'')), ''), ''),
    'provider', r.provider_id
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6) Realtime
ALTER TABLE public.provider_settlement_requests REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='provider_settlement_requests';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_settlement_requests';
  END IF;
END $$;
