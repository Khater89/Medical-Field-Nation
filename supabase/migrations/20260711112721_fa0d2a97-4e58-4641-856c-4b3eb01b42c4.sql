CREATE OR REPLACE FUNCTION public.prevent_booking_financial_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_priv boolean;
  is_provider_checkout boolean := COALESCE(current_setting('app.provider_checkout', true), '') = 'true';
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  is_priv := public.has_role(uid, 'admin') OR public.has_role(uid, 'cs');
  IF is_priv THEN
    RETURN NEW;
  END IF;

  -- Allow the dedicated server-side provider checkout RPC to set only the checkout total.
  -- Direct client updates still cannot opt into this path through normal app APIs.
  IF is_provider_checkout
     AND OLD.assigned_provider_id = uid
     AND OLD.status = 'IN_PROGRESS'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.final_price IS NOT DISTINCT FROM OLD.final_price
     AND NEW.agreed_price IS NOT DISTINCT FROM OLD.agreed_price
     AND NEW.subtotal IS NOT DISTINCT FROM OLD.subtotal
     AND NEW.platform_fee IS NOT DISTINCT FROM OLD.platform_fee
     AND NEW.provider_payout IS NOT DISTINCT FROM OLD.provider_payout
     AND NEW.provider_share IS NOT DISTINCT FROM OLD.provider_share
     AND NEW.deposit_amount IS NOT DISTINCT FROM OLD.deposit_amount
     AND NEW.deposit_status IS NOT DISTINCT FROM OLD.deposit_status
     AND NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status
     AND NEW.payment_method IS NOT DISTINCT FROM OLD.payment_method
     AND NEW.price_locked IS NOT DISTINCT FROM OLD.price_locked
     AND NEW.price_locked_at IS NOT DISTINCT FROM OLD.price_locked_at
     AND NEW.price_locked_by IS NOT DISTINCT FROM OLD.price_locked_by
     AND NEW.stripe_session_id IS NOT DISTINCT FROM OLD.stripe_session_id
     AND NEW.stripe_payment_intent_id IS NOT DISTINCT FROM OLD.stripe_payment_intent_id
     AND NEW.stripe_transfer_id IS NOT DISTINCT FROM OLD.stripe_transfer_id
     AND NEW.stripe_application_fee_amount IS NOT DISTINCT FROM OLD.stripe_application_fee_amount
  THEN
    RETURN NEW;
  END IF;

  -- Applies to both customer-owner and assigned provider paths
  IF (OLD.customer_user_id = uid) OR (OLD.assigned_provider_id = uid) THEN
    IF NEW.final_price          IS DISTINCT FROM OLD.final_price
    OR NEW.agreed_price         IS DISTINCT FROM OLD.agreed_price
    OR NEW.subtotal             IS DISTINCT FROM OLD.subtotal
    OR NEW.calculated_total     IS DISTINCT FROM OLD.calculated_total
    OR NEW.platform_fee         IS DISTINCT FROM OLD.platform_fee
    OR NEW.provider_payout      IS DISTINCT FROM OLD.provider_payout
    OR NEW.provider_share       IS DISTINCT FROM OLD.provider_share
    OR NEW.deposit_amount       IS DISTINCT FROM OLD.deposit_amount
    OR NEW.deposit_status       IS DISTINCT FROM OLD.deposit_status
    OR NEW.payment_status       IS DISTINCT FROM OLD.payment_status
    OR NEW.payment_method       IS DISTINCT FROM OLD.payment_method
    OR NEW.price_locked         IS DISTINCT FROM OLD.price_locked
    OR NEW.price_locked_at      IS DISTINCT FROM OLD.price_locked_at
    OR NEW.price_locked_by      IS DISTINCT FROM OLD.price_locked_by
    OR NEW.stripe_session_id            IS DISTINCT FROM OLD.stripe_session_id
    OR NEW.stripe_payment_intent_id     IS DISTINCT FROM OLD.stripe_payment_intent_id
    OR NEW.stripe_transfer_id           IS DISTINCT FROM OLD.stripe_transfer_id
    OR NEW.stripe_application_fee_amount IS DISTINCT FROM OLD.stripe_application_fee_amount
    THEN
      RAISE EXCEPTION 'Not allowed to modify financial fields on this booking'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.provider_checkout_booking(
  _booking_id uuid,
  _duration_minutes integer,
  _calculated_total numeric
)
RETURNS public.bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  b public.bookings;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _duration_minutes IS NULL OR _duration_minutes < 1 OR _duration_minutes > 1440 THEN
    RAISE EXCEPTION 'Invalid duration' USING ERRCODE = '22023';
  END IF;

  IF _calculated_total IS NULL OR _calculated_total < 0 THEN
    RAISE EXCEPTION 'Invalid calculated total' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF b.assigned_provider_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Not your booking' USING ERRCODE = '42501';
  END IF;

  IF b.status <> 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Booking is not in progress' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.provider_checkout', 'true', true);

  UPDATE public.bookings
  SET check_out_at = now(),
      actual_duration_minutes = _duration_minutes,
      calculated_total = _calculated_total
  WHERE id = _booking_id
  RETURNING * INTO b;

  RETURN b;
END;
$function$;

REVOKE ALL ON FUNCTION public.provider_checkout_booking(uuid, integer, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provider_checkout_booking(uuid, integer, numeric) TO authenticated;