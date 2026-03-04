ALTER TABLE public.provider_wallet_ledger 
ADD COLUMN cliq_reference text DEFAULT NULL,
ADD COLUMN settled_at timestamptz DEFAULT NULL;