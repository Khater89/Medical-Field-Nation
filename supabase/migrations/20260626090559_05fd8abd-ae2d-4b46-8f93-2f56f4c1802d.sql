
-- Allow guest chats & guest orders in marketplace
ALTER TABLE public.marketplace_chats ALTER COLUMN customer_user_id DROP NOT NULL;
ALTER TABLE public.marketplace_chats ADD COLUMN IF NOT EXISTS guest_token text UNIQUE;
ALTER TABLE public.marketplace_chats ADD COLUMN IF NOT EXISTS customer_phone_norm text;
CREATE INDEX IF NOT EXISTS idx_mp_chats_vendor_phone ON public.marketplace_chats(vendor_id, customer_phone_norm);

ALTER TABLE public.marketplace_messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.marketplace_messages ADD COLUMN IF NOT EXISTS sender_name text;

-- Guest orders: customer_user_id already nullable. Ensure we track guest reference.
ALTER TABLE public.marketplace_orders ADD COLUMN IF NOT EXISTS guest_token text;
ALTER TABLE public.marketplace_orders ADD COLUMN IF NOT EXISTS customer_phone_norm text;
CREATE INDEX IF NOT EXISTS idx_mp_orders_phone ON public.marketplace_orders(customer_phone_norm);

-- Helper: normalize phone (digits only, last 9)
CREATE OR REPLACE FUNCTION public.mp_normalize_phone(_p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN _p IS NULL THEN NULL
    ELSE right(regexp_replace(_p, '[^0-9]', '', 'g'), 9) END;
$$;
