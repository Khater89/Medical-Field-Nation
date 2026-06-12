-- 1. data_access_log: remove open INSERT (service role bypasses RLS)
DROP POLICY IF EXISTS "Authenticated can insert logs" ON public.data_access_log;

-- 2. notifications_log: remove open INSERT
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications_log;

-- 3. platform_settings: restrict full row read to admin/cs only
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.platform_settings;

CREATE POLICY "Admins can read settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "CS can read settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (public.is_cs());

-- Public-safe RPC for operational fields needed by providers/customers
CREATE OR REPLACE FUNCTION public.get_platform_public_settings()
RETURNS TABLE (
  platform_fee_percent numeric,
  deposit_percent numeric,
  provider_debt_limit numeric,
  coordinator_phone text,
  coordinator_phone_2 text,
  bank_name text,
  bank_iban text,
  bank_cliq_alias text,
  bank_account_holder text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT platform_fee_percent, deposit_percent, provider_debt_limit,
         coordinator_phone, coordinator_phone_2,
         bank_name, bank_iban, bank_cliq_alias, bank_account_holder
  FROM public.platform_settings
  WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_platform_public_settings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_platform_public_settings() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_platform_public_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_public_settings() TO service_role;

-- 4. profiles: prevent non-admin from modifying privileged columns
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.provider_status IS DISTINCT FROM OLD.provider_status
     OR NEW.stripe_connect_account_id IS DISTINCT FROM OLD.stripe_connect_account_id
     OR NEW.provider_number IS DISTINCT FROM OLD.provider_number
     OR NEW.role_type IS DISTINCT FROM OLD.role_type
     OR NEW.is_provider IS DISTINCT FROM OLD.is_provider
  THEN
    RAISE EXCEPTION 'Not allowed to modify privileged profile fields'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;
CREATE TRIGGER profiles_prevent_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 5. Storage policies for provider-licenses / provider-certificates

DROP POLICY IF EXISTS "CS can read all licenses" ON storage.objects;
CREATE POLICY "CS can read all licenses"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'provider-licenses' AND public.is_cs());

DROP POLICY IF EXISTS "Providers can delete own licenses" ON storage.objects;
CREATE POLICY "Providers can delete own licenses"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'provider-licenses'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Providers can delete own certificates" ON storage.objects;
CREATE POLICY "Providers can delete own certificates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'provider-certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );