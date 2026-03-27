ALTER TABLE public.platform_settings 
  ADD COLUMN IF NOT EXISTS bank_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_iban text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_cliq_alias text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_account_holder text DEFAULT NULL;