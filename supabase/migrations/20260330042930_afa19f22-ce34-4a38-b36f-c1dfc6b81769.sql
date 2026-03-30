-- Ensure approved providers receive an automatic reference number
CREATE OR REPLACE FUNCTION public.assign_provider_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.provider_number IS NULL
     AND (
       NEW.provider_status = 'approved'
       OR EXISTS (
         SELECT 1
         FROM public.user_roles
         WHERE user_id = NEW.user_id
           AND role = 'provider'
       )
     ) THEN
    NEW.provider_number := nextval('public.provider_number_seq');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_provider_number_on_profiles ON public.profiles;
CREATE TRIGGER assign_provider_number_on_profiles
BEFORE INSERT OR UPDATE OF provider_status, provider_number ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_provider_number();

CREATE OR REPLACE FUNCTION public.sync_provider_number_from_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'provider' THEN
    UPDATE public.profiles
    SET provider_number = COALESCE(provider_number, nextval('public.provider_number_seq'))
    WHERE user_id = NEW.user_id
      AND provider_number IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_provider_number_from_role_on_user_roles ON public.user_roles;
CREATE TRIGGER sync_provider_number_from_role_on_user_roles
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_provider_number_from_role();