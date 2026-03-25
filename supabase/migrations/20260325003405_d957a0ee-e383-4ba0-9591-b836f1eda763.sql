
CREATE TABLE public.provider_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  rated_by uuid,
  rating smallint NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

ALTER TABLE public.provider_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_ratings" ON public.provider_ratings FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "cs_manage_ratings" ON public.provider_ratings FOR ALL TO authenticated USING (is_cs()) WITH CHECK (is_cs());
CREATE POLICY "provider_read_own_ratings" ON public.provider_ratings FOR SELECT TO authenticated USING (is_provider() AND provider_id = auth.uid());

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_rating BEFORE INSERT OR UPDATE ON public.provider_ratings
FOR EACH ROW EXECUTE FUNCTION public.validate_rating();
