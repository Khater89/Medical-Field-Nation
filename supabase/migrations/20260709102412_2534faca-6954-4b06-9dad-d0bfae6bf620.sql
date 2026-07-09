ALTER VIEW public.marketplace_vendors_public SET (security_invoker = false);
GRANT SELECT ON public.marketplace_vendors_public TO anon, authenticated;