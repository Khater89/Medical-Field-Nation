
-- 1) Convert view to SECURITY INVOKER
ALTER VIEW public.marketplace_vendors_public SET (security_invoker = true);

-- 2) Bookings customer/provider financial-field guard
CREATE OR REPLACE FUNCTION public.prevent_booking_financial_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_priv boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  is_priv := public.has_role(uid, 'admin') OR public.has_role(uid, 'cs');
  IF is_priv THEN
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
$$;

DROP TRIGGER IF EXISTS trg_prevent_booking_financial_tampering ON public.bookings;
CREATE TRIGGER trg_prevent_booking_financial_tampering
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_financial_tampering();

-- 3) Marketplace orders vendor financial-field guard
CREATE OR REPLACE FUNCTION public.prevent_marketplace_order_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.has_role(uid, 'admin') OR public.has_role(uid, 'cs') THEN
    RETURN NEW;
  END IF;

  IF public.user_owns_vendor(OLD.vendor_id) THEN
    IF NEW.subtotal              IS DISTINCT FROM OLD.subtotal
    OR NEW.total                 IS DISTINCT FROM OLD.total
    OR NEW.discount              IS DISTINCT FROM OLD.discount
    OR NEW.delivery_fee          IS DISTINCT FROM OLD.delivery_fee
    OR NEW.platform_fee_percent  IS DISTINCT FROM OLD.platform_fee_percent
    OR NEW.platform_fee_amount   IS DISTINCT FROM OLD.platform_fee_amount
    OR NEW.vendor_payout         IS DISTINCT FROM OLD.vendor_payout
    OR NEW.payment_status        IS DISTINCT FROM OLD.payment_status
    OR NEW.payment_method        IS DISTINCT FROM OLD.payment_method
    OR NEW.currency              IS DISTINCT FROM OLD.currency
    THEN
      RAISE EXCEPTION 'Vendors cannot modify pricing or payment fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_marketplace_order_tampering ON public.marketplace_orders;
CREATE TRIGGER trg_prevent_marketplace_order_tampering
BEFORE UPDATE ON public.marketplace_orders
FOR EACH ROW EXECUTE FUNCTION public.prevent_marketplace_order_tampering();
