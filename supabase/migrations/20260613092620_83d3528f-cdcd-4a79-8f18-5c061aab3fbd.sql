ALTER TABLE public.provider_wallet_ledger DROP CONSTRAINT IF EXISTS provider_wallet_ledger_reason_check;
ALTER TABLE public.provider_wallet_ledger ADD CONSTRAINT provider_wallet_ledger_reason_check
  CHECK (reason = ANY (ARRAY[
    'commission','settlement','adjustment','platform_fee',
    'cliq_payment_credit','platform_fee_reversal',
    'settlement_request','settlement_request_cancelled'
  ]));