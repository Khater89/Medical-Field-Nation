REVOKE ALL ON FUNCTION public.can_provider_message_booking(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_provider_message_booking(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_provider_message_booking(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.send_booking_message(uuid, text, text, numeric, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_booking_message(uuid, text, text, numeric, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.send_booking_message(uuid, text, text, numeric, uuid, text) TO authenticated;