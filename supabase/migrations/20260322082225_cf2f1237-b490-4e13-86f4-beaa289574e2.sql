
-- Add professional bio column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Create storage bucket for provider licenses
INSERT INTO storage.buckets (id, name, public)
VALUES ('provider-licenses', 'provider-licenses', false)
ON CONFLICT (id) DO NOTHING;

-- Add license_file_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS license_file_url text;

-- RLS for provider-licenses bucket: providers can upload their own files
CREATE POLICY "Providers can upload own licenses"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'provider-licenses' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Providers can read own files
CREATE POLICY "Providers can read own licenses"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'provider-licenses' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can read all license files
CREATE POLICY "Admins can read all licenses"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'provider-licenses' AND public.is_admin());
