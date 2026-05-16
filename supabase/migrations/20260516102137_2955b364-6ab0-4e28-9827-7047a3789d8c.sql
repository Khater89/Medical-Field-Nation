
-- Extend allowed wallet ledger reasons to include CliQ credit and platform_fee reversal
ALTER TABLE public.provider_wallet_ledger DROP CONSTRAINT IF EXISTS provider_wallet_ledger_reason_check;
ALTER TABLE public.provider_wallet_ledger ADD CONSTRAINT provider_wallet_ledger_reason_check
  CHECK (reason = ANY (ARRAY['commission'::text, 'settlement'::text, 'adjustment'::text, 'platform_fee'::text, 'cliq_payment_credit'::text, 'platform_fee_reversal'::text]));

-- Update record_completion_debt trigger to gracefully handle NULL provider_share
-- by falling back to platform_settings.platform_fee_percent
CREATE OR REPLACE FUNCTION public.record_completion_debt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_total numeric;
  provider_total numeric;
  spread numeric;
  initial_spread numeric;
  delta numeric;
  existing_debt numeric;
  fee_pct numeric;
  effective_provider_share numeric;
BEGIN
  -- Resolve effective provider_share (fallback to platform settings)
  effective_provider_share := NEW.provider_share;
  IF effective_provider_share IS NULL AND NEW.agreed_price IS NOT NULL THEN
    SELECT COALESCE(platform_fee_percent, 10) INTO fee_pct FROM public.platform_settings WHERE id = 1;
    fee_pct := COALESCE(fee_pct, 10);
    effective_provider_share := ROUND(NEW.agreed_price * (1 - fee_pct / 100.0), 2);
  END IF;

  -- Case 1: ACCEPTED — record initial debt (base spread)
  IF NEW.status = 'ACCEPTED' AND OLD.status <> 'ACCEPTED' THEN
    IF NEW.agreed_price IS NOT NULL AND effective_provider_share IS NOT NULL AND NEW.assigned_provider_id IS NOT NULL THEN
      initial_spread := NEW.agreed_price - effective_provider_share;
      IF initial_spread > 0 THEN
        -- Idempotency: don't double-insert if a platform_fee entry already exists for this booking
        IF NOT EXISTS (SELECT 1 FROM public.provider_wallet_ledger WHERE booking_id = NEW.id AND reason = 'platform_fee') THEN
          INSERT INTO public.provider_wallet_ledger (provider_id, amount, reason, booking_id)
          VALUES (NEW.assigned_provider_id, -initial_spread, 'platform_fee', NEW.id);
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Case 2: COMPLETED — adjust debt for extra time
  IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
    IF NEW.assigned_provider_id IS NULL OR NEW.agreed_price IS NULL OR NEW.actual_duration_minutes IS NULL THEN
      RETURN NEW;
    END IF;
    IF effective_provider_share IS NULL THEN RETURN NEW; END IF;

    client_total := public.calc_escalating_price(NEW.agreed_price, NEW.actual_duration_minutes);
    provider_total := public.calc_escalating_price(effective_provider_share, NEW.actual_duration_minutes);
    spread := client_total - provider_total;

    NEW.calculated_total := client_total;

    SELECT COALESCE(SUM(ABS(amount)), 0) INTO existing_debt
    FROM public.provider_wallet_ledger
    WHERE provider_id = NEW.assigned_provider_id
      AND booking_id = NEW.id
      AND reason = 'platform_fee';

    delta := spread - existing_debt;
    IF delta > 0 THEN
      INSERT INTO public.provider_wallet_ledger (provider_id, amount, reason, booking_id)
      VALUES (NEW.assigned_provider_id, -delta, 'platform_fee', NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Backfill: for any COMPLETED booking with an assigned provider and agreed_price but no ledger entry, create the platform_fee entry
DO $$
DECLARE
  r RECORD;
  fee_pct numeric;
  eff_share numeric;
  spread numeric;
BEGIN
  SELECT COALESCE(platform_fee_percent, 10) INTO fee_pct FROM public.platform_settings WHERE id = 1;
  fee_pct := COALESCE(fee_pct, 10);
  FOR r IN
    SELECT id, assigned_provider_id, agreed_price, provider_share
    FROM public.bookings
    WHERE status IN ('ACCEPTED','COMPLETED')
      AND assigned_provider_id IS NOT NULL
      AND agreed_price IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.provider_wallet_ledger w WHERE w.booking_id = bookings.id AND w.reason = 'platform_fee')
  LOOP
    eff_share := COALESCE(r.provider_share, ROUND(r.agreed_price * (1 - fee_pct / 100.0), 2));
    spread := r.agreed_price - eff_share;
    IF spread > 0 THEN
      INSERT INTO public.provider_wallet_ledger (provider_id, amount, reason, booking_id)
      VALUES (r.assigned_provider_id, -spread, 'platform_fee', r.id);
    END IF;
  END LOOP;
END $$;
