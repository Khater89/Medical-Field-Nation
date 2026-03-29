-- Provider quotes table
CREATE TABLE public.provider_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL,
  quoted_price numeric NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, provider_id)
);

ALTER TABLE public.provider_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_manage_quotes ON public.provider_quotes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY cs_read_quotes ON public.provider_quotes FOR SELECT TO authenticated USING (is_cs());
CREATE POLICY provider_insert_quotes ON public.provider_quotes FOR INSERT TO authenticated WITH CHECK (is_provider() AND provider_id = auth.uid());
CREATE POLICY provider_read_own_quotes ON public.provider_quotes FOR SELECT TO authenticated USING (is_provider() AND provider_id = auth.uid());

-- RPC: available bookings for providers (NEW status only, no PII)
CREATE OR REPLACE FUNCTION public.available_bookings_for_providers()
RETURNS TABLE(
  id uuid,
  service_id text,
  city text,
  scheduled_at timestamptz,
  booking_number text,
  area_public text,
  notes text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.id, b.service_id, b.city, b.scheduled_at, b.booking_number, b.area_public, b.notes, b.created_at
  FROM public.bookings b
  WHERE b.status = 'NEW'
    AND is_provider()
  ORDER BY b.created_at DESC;
$$;