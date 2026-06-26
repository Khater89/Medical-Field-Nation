
CREATE POLICY "mp_chat_auth_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketplace-chat');
CREATE POLICY "mp_chat_auth_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketplace-chat');
