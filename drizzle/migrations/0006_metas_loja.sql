CREATE TABLE public.metas_loja (
  mes date NOT NULL,
  loja text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mes, loja)
);
GRANT SELECT ON public.metas_loja TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas_loja TO authenticated;
GRANT ALL ON public.metas_loja TO service_role;
ALTER TABLE public.metas_loja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem metas das lojas" ON public.metas_loja FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insere metas das lojas" ON public.metas_loja FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin altera metas das lojas" ON public.metas_loja FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin apaga metas das lojas" ON public.metas_loja FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));