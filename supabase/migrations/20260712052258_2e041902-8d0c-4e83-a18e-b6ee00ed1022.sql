
-- 1) Fix SECURITY DEFINER view: force security_invoker so RLS of the caller applies.
ALTER VIEW public.marketplace_vendors_public SET (security_invoker = true);

-- 2) Extend booking financial-tampering trigger to also block OTP changes
--    by customer/provider paths. Admin/CS/edge-function paths remain unaffected.
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
     AND NEW.otp_code IS NOT DISTINCT FROM OLD.otp_code
  THEN
    RETURN NEW;
  END IF;

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
    OR NEW.otp_code             IS DISTINCT FROM OLD.otp_code
    THEN
      RAISE EXCEPTION 'Not allowed to modify financial or security fields on this booking'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) Extend product-approval trigger to prevent vendors from self-approving
--    or self-featuring any product (regardless of pharmacy/sensitivity).
CREATE OR REPLACE FUNCTION public.mp_enforce_product_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  vt public.marketplace_vendor_type;
  uid uuid := auth.uid();
  is_admin_user boolean := (uid IS NOT NULL AND public.is_admin());
BEGIN
  SELECT vendor_type INTO vt FROM public.marketplace_vendors WHERE id = NEW.vendor_id;

  IF TG_OP = 'INSERT' THEN
    -- Non-admin inserts always start pending; is_featured only set by admins.
    IF NOT is_admin_user THEN
      NEW.approval_status := 'pending';
      NEW.is_featured := false;
    END IF;
    -- Pharmacy sensitive/prescription items always start pending regardless.
    IF vt = 'pharmacy' AND (NEW.is_sensitive = true OR NEW.requires_prescription = true) THEN
      IF NOT is_admin_user THEN
        NEW.approval_status := 'pending';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: only admins may change moderation flags.
  IF NOT is_admin_user THEN
    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
    OR NEW.is_featured IS DISTINCT FROM OLD.is_featured
    THEN
      RAISE EXCEPTION 'Vendors cannot modify approval_status or is_featured — admin only'
        USING ERRCODE = '42501';
    END IF;
    -- Any content edit on a pharmacy sensitive/prescription item resets to pending.
    IF vt = 'pharmacy' AND (NEW.is_sensitive = true OR NEW.requires_prescription = true) THEN
      NEW.approval_status := 'pending';
    END IF;
  END IF;

  RETURN NEW;
END $function$;
