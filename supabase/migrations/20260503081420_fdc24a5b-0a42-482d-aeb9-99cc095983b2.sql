CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  completion_requested boolean;
  completion_fields_valid boolean;
BEGIN
  -- Admin/staff managed updates are allowed to control review and privileged fields.
  IF public.is_admin() OR public.is_cs() THEN
    RETURN NEW;
  END IF;

  -- Never let regular users change review/payment-provider privileged fields directly.
  NEW.provider_status := OLD.provider_status;
  NEW.stripe_connect_account_id := OLD.stripe_connect_account_id;
  NEW.stripe_connect_onboarding_status := OLD.stripe_connect_onboarding_status;

  -- Provider profile completion is allowed only for the authenticated owner of the profile.
  completion_requested := COALESCE(NEW.profile_completed, false) IS DISTINCT FROM COALESCE(OLD.profile_completed, false)
    AND COALESCE(NEW.profile_completed, false) = true;

  completion_fields_valid :=
    auth.uid() = OLD.user_id
    AND NEW.role_type IN ('doctor', 'nurse', 'physiotherapist', 'caregiver')
    AND length(trim(COALESCE(NEW.license_id, ''))) > 0
    AND length(trim(COALESCE(NEW.academic_cert_url, ''))) > 0
    AND length(trim(COALESCE(NEW.address_text, ''))) > 0;

  -- Owner may freely update role_type and license_id (re-review may be required by staff offline).
  -- Privileged review state remains protected above.

  -- Do not allow marking a profile complete unless all mandatory professional fields are present.
  IF completion_requested AND NOT completion_fields_valid THEN
    NEW.profile_completed := OLD.profile_completed;
  END IF;

  RETURN NEW;
END;
$function$;