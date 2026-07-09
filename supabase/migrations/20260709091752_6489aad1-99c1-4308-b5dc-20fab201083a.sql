
CREATE OR REPLACE FUNCTION public.enforce_customer_booking_safe_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin() OR public.is_cs() THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  NEW.status := 'NEW';
  NEW.subtotal := 0;
  NEW.platform_fee := 0;
  NEW.provider_payout := 0;
  NEW.provider_share := NULL;
  NEW.calculated_total := NULL;
  NEW.deposit_amount := 0;
  NEW.remaining_cash_amount := 0;
  NEW.deposit_status := 'NONE';
  NEW.payment_status := 'UNPAID';
  NEW.stripe_session_id := NULL;
  NEW.stripe_payment_intent_id := NULL;
  NEW.stripe_transfer_id := NULL;
  NEW.stripe_application_fee_amount := 0;
  NEW.connect_charge_type := 'none';
  NEW.assigned_provider_id := NULL;
  NEW.assigned_at := NULL;
  NEW.assigned_by := NULL;
  NEW.accepted_at := NULL;
  NEW.completed_at := NULL;
  NEW.completed_by := NULL;
  NEW.agreed_price := NULL;
  NEW.reveal_contact_allowed := false;
  NEW.contact_revealed_at := NULL;

  RETURN NEW;
END;
$function$;
