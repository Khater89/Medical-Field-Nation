DELETE FROM public.services s
WHERE s.created_at::date = DATE '2026-09-14'
  AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.service_id::text = s.id::text);