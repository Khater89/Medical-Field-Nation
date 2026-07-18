
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.notify_n8n_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  contact RECORD;
  payload jsonb;
BEGIN
  IF NEW.status = 'CONFIRMED' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT full_name, phone, address_text INTO contact
    FROM public.booking_contacts WHERE booking_id = NEW.id;

    payload := jsonb_build_object(
      'event', 'booking_confirmed',
      'booking_id', NEW.id,
      'booking_number', NEW.booking_number,
      'status', NEW.status,
      'customer_name', contact.full_name,
      'customer_phone', contact.phone,
      'address', contact.address_text,
      'city', NEW.city,
      'area', NEW.area,
      'service_id', NEW.service_id,
      'service_name', NEW.service_name,
      'scheduled_at', NEW.scheduled_at,
      'duration_minutes', NEW.duration_minutes,
      'price', NEW.price,
      'payment_method', NEW.payment_method,
      'notes', NEW.notes,
      'required_gender', NEW.required_gender,
      'created_at', NEW.created_at
    );

    PERFORM extensions.http_post(
      url := 'https://khaterover.app.n8n.cloud/webhook-test/3339ca8b-d8d3-40ee-9750-3c6c9991f84a',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := payload
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_n8n_booking_confirmed ON public.bookings;
CREATE TRIGGER trg_notify_n8n_booking_confirmed
AFTER INSERT OR UPDATE OF status ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_n8n_booking_confirmed();
