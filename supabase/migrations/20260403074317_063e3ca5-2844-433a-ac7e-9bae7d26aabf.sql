
-- Allow customers to update payment_method and payment_status on their own completed bookings
CREATE POLICY "customer_update_payment_on_completed"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  customer_user_id = auth.uid()
  AND status = 'COMPLETED'
)
WITH CHECK (
  customer_user_id = auth.uid()
  AND status = 'COMPLETED'
);
