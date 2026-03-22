
-- Update the calc_escalating_price function to new formula:
-- First 60 min = base_price
-- After 60 min: each additional 15-min segment adds 8% of base_price
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
  RETURN base_price + (segments * base_price * 0.08);
END;
$function$;

-- Update the record_completion_debt trigger to use the new formula
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
BEGIN
  -- Case 1: ACCEPTED — record initial debt (base spread)
  IF NEW.status = 'ACCEPTED' AND OLD.status <> 'ACCEPTED' THEN
    IF NEW.agreed_price IS NOT NULL AND NEW.provider_share IS NOT NULL AND NEW.assigned_provider_id IS NOT NULL THEN
      initial_spread := NEW.agreed_price - NEW.provider_share;
      IF initial_spread > 0 THEN
        INSERT INTO public.provider_wallet_ledger (provider_id, amount, reason, booking_id)
        VALUES (NEW.assigned_provider_id, -initial_spread, 'platform_fee', NEW.id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Case 2: COMPLETED — adjust debt for extra time
  IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
    IF NEW.assigned_provider_id IS NULL
       OR NEW.agreed_price IS NULL
       OR NEW.provider_share IS NULL
       OR NEW.actual_duration_minutes IS NULL THEN
      RETURN NEW;
    END IF;

    client_total := public.calc_escalating_price(NEW.agreed_price, NEW.actual_duration_minutes);
    provider_total := public.calc_escalating_price(NEW.provider_share, NEW.actual_duration_minutes);
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
