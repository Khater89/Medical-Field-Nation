-- Function to check and auto-suspend providers with 5 consecutive low ratings
CREATE OR REPLACE FUNCTION public.check_auto_suspension_on_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  consecutive_low integer := 0;
  r record;
BEGIN
  -- Get last 5 ratings for this provider ordered by most recent
  FOR r IN
    SELECT rating FROM public.provider_ratings
    WHERE provider_id = NEW.provider_id
    ORDER BY created_at DESC
    LIMIT 5
  LOOP
    IF r.rating <= 2 THEN
      consecutive_low := consecutive_low + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;

  -- If 5 consecutive low ratings, suspend the provider
  IF consecutive_low >= 5 THEN
    UPDATE public.profiles
    SET provider_status = 'suspended'
    WHERE user_id = NEW.provider_id;

    DELETE FROM public.user_roles
    WHERE user_id = NEW.provider_id AND role = 'provider';

    INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
    VALUES (
      '⚠️ إيقاف تلقائي: تقييم منخفض متكرر',
      'تم إيقاف المزود تلقائياً بسبب حصوله على 5 تقييمات منخفضة متتالية (2 نجمة أو أقل)',
      'admin',
      NEW.provider_id
    );

    INSERT INTO public.staff_notifications (title, body, target_role, provider_id)
    VALUES (
      '⚠️ تم إيقاف حسابك',
      'تم إيقاف حسابك تلقائياً بسبب حصولك على 5 تقييمات منخفضة متتالية. يرجى التواصل مع الإدارة.',
      'provider',
      NEW.provider_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_auto_suspension
AFTER INSERT ON public.provider_ratings
FOR EACH ROW
EXECUTE FUNCTION public.check_auto_suspension_on_rating();