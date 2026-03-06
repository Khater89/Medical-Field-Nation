
-- Fix: expand staff_users role check constraint to include owner/owner_assistant
ALTER TABLE public.staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE public.staff_users ADD CONSTRAINT staff_users_role_check 
  CHECK (role IN ('admin', 'cs', 'owner', 'owner_assistant', 'support'));

-- Seed owner record (retry after constraint fix)
DO $$
DECLARE owner_uid uuid;
BEGIN
  SELECT id INTO owner_uid FROM auth.users WHERE email = 'abdelrahman.khater.elc@gmail.com' LIMIT 1;
  IF owner_uid IS NOT NULL THEN
    INSERT INTO public.staff_users (user_id, role) VALUES (owner_uid, 'owner')
    ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
  END IF;
END;
$$;
