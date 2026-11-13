DROP POLICY IF EXISTS "Todos veem metas das lojas" ON public.metas_loja;
REVOKE SELECT ON public.metas_loja FROM anon;
GRANT ALL ON public.metas_loja TO service_role;
CREATE POLICY "Admin vê metas das lojas" ON public.metas_loja FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));