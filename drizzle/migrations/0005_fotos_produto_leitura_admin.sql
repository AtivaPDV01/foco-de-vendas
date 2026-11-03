CREATE POLICY "Admin lê fotos de produto" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'campanha-produtos' AND public.has_role(auth.uid(), 'admin'));