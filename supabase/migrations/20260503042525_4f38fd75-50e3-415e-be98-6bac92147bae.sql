
-- 1. Trigger: prevent privilege escalation via profiles self-update
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip enforcement for admins
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Lock down sensitive/privileged fields to their previous values
  NEW.provider_status := OLD.provider_status;
  NEW.role_type := OLD.role_type;
  NEW.license_id := OLD.license_id;
  NEW.stripe_connect_account_id := OLD.stripe_connect_account_id;
  NEW.stripe_connect_onboarding_status := OLD.stripe_connect_onboarding_status;
  NEW.profile_completed := OLD.profile_completed;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2. Trigger: enforce safe financial defaults on customer-created bookings
CREATE OR REPLACE FUNCTION public.enforce_customer_booking_safe_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip enforcement for admins, CS, and service role; only constrain end customers
  IF public.is_admin() OR public.is_cs() THEN
    RETURN NEW;
  END IF;

  -- Only enforce for rows being created by the customer themselves
  IF NEW.customer_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Force safe initial state - server-side flows compute real values later
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
  NEW.otp_code := NULL;
  NEW.agreed_price := NULL;
  NEW.reveal_contact_allowed := false;
  NEW.contact_revealed_at := NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_booking_safe_defaults ON public.bookings;
CREATE TRIGGER trg_enforce_customer_booking_safe_defaults
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_customer_booking_safe_defaults();

-- 3. Restrict staff_notifications system insert policy to authenticated users
DROP POLICY IF EXISTS "system_insert_notifications" ON public.staff_notifications;
CREATE POLICY "system_insert_notifications"
ON public.staff_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);
