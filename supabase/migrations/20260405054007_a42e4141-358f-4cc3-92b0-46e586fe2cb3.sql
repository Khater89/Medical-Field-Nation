ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('NEW', 'CONFIRMED', 'ASSIGNED', 'ACCEPTED', 'PROVIDER_ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'));