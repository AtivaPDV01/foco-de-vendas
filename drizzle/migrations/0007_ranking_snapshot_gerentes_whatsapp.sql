CREATE TABLE public.ranking_snapshot (
  data date not null,
  tipo text not null check (tipo in ('vendedor', 'loja')),
  id text not null,
  posicao integer not null,
  unidades integer not null,
  primary key (data, tipo, id)
);
GRANT SELECT ON public.ranking_snapshot TO anon, authenticated;
GRANT ALL ON public.ranking_snapshot TO service_role;
ALTER TABLE public.ranking_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem snapshots do ranking" ON public.ranking_snapshot FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.snapshot_ranking(_data date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _mes date := date_trunc('month', _data)::date;
BEGIN
  DELETE FROM ranking_snapshot WHERE data = _data;
  INSERT INTO ranking_snapshot (data, tipo, id, posicao, unidades)
  SELECT _data, 'vendedor', vendedor,
         row_number() OVER (ORDER BY sum(quantidade) DESC, vendedor),
         sum(quantidade)::integer
  FROM vendas
  WHERE data >= _mes AND data <= _data
  GROUP BY vendedor;
  INSERT INTO ranking_snapshot (data, tipo, id, posicao, unidades)
  SELECT _data, 'loja', loja,
         row_number() OVER (ORDER BY sum(quantidade) DESC, loja),
         sum(quantidade)::integer
  FROM vendas
  WHERE data >= _mes AND data <= _data
  GROUP BY loja;
  RETURN 1;
END;
$$;

CREATE TABLE public.gerentes (
  id uuid primary key default gen_random_uuid(),
  loja text not null,
  primeiro_nome text not null,
  telefone text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gerentes TO authenticated;
GRANT ALL ON public.gerentes TO service_role;
ALTER TABLE public.gerentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia gerentes" ON public.gerentes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  gerente_id uuid references public.gerentes(id) on delete set null,
  loja text,
  telefone text not null,
  mensagem text not null,
  status text not null,
  erro text,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.whatsapp_logs TO authenticated;
GRANT ALL ON public.whatsapp_logs TO service_role;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê logs de whatsapp" ON public.whatsapp_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));