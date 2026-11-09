-- Campanhas mensais e seus produtos foco (gerenciados no /admin)
CREATE TABLE public.campanhas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes date NOT NULL UNIQUE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campanhas TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campanhas TO authenticated;
GRANT ALL ON public.campanhas TO service_role;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem campanhas" ON public.campanhas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insere campanhas" ON public.campanhas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin altera campanhas" ON public.campanhas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin apaga campanhas" ON public.campanhas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.campanha_produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id uuid NOT NULL REFERENCES public.campanhas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  imagem_url text,
  id_produto_mercaflow integer,
  meta integer,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX campanha_produtos_campanha_idx ON public.campanha_produtos (campanha_id, ordem);
GRANT SELECT ON public.campanha_produtos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.campanha_produtos TO authenticated;
GRANT ALL ON public.campanha_produtos TO service_role;
ALTER TABLE public.campanha_produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem produtos da campanha" ON public.campanha_produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insere produtos da campanha" ON public.campanha_produtos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin altera produtos da campanha" ON public.campanha_produtos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin apaga produtos da campanha" ON public.campanha_produtos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Campanha de novembro (antes fixa no código) passa para o banco
WITH c AS (
  INSERT INTO public.campanhas (mes, nome) VALUES ('2026-11-01', 'ATIVA PDV NOVEMBRO') RETURNING id
)
INSERT INTO public.campanha_produtos (campanha_id, nome, imagem_url, id_produto_mercaflow, ordem)
SELECT c.id, p.nome, p.imagem, p.idp, p.ordem FROM c, (VALUES
  ('Canudo Dodele Chocolate', '/__l5e/assets-v1/5a07db11-c265-42e5-a282-9266e8745e88/canudo-dodele-chocolate.png', 10128, 1),
  ('Canudo Dodele Doce de Leite', '/__l5e/assets-v1/9ce59e14-c38d-485a-a870-67be9421727d/canudo-dodele-doce-de-leite.png', 220, 2),
  ('Fini Tutti Frutti 35g', '/__l5e/assets-v1/665925ea-4d89-4608-9adf-2f99b23bc7b1/fini-tutti-frutti-35g.png', 13313, 3),
  ('Sonho de Valsa 20g', '/__l5e/assets-v1/a90562fa-2f9f-45ad-b4f8-0f268da4f89b/sonho-de-valsa-20g.png', 201, 4),
  ('Ouro Branco 20g', '/__l5e/assets-v1/742bfa47-8b86-4c00-a6b8-3c3aa97d6f68/ouro-branco-20g.png', 200, 5),
  ('Pé de Moça Dodele', '/__l5e/assets-v1/a89053ff-95ef-4e45-a4fb-23fdf91028d9/pe-de-moca-dodele.png', 908, 6)
) AS p(nome, imagem, idp, ordem);

-- Venda por produto (vinda do Mercaflow), lida só pelas funções agregadas
CREATE TABLE public.vendas_produto (
  data date NOT NULL,
  vendedor text NOT NULL,
  loja text NOT NULL,
  id_produto integer NOT NULL,
  produto text NOT NULL,
  quantidade integer NOT NULL,
  PRIMARY KEY (data, vendedor, loja, id_produto)
);
CREATE INDEX vendas_produto_data_idx ON public.vendas_produto (data);
GRANT ALL ON public.vendas_produto TO service_role;
ALTER TABLE public.vendas_produto ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.aplicar_vendas_produto(_periodos jsonb, _linhas jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _n integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sincronizacao_mercaflow_produtos'));
  DELETE FROM public.vendas_produto v
   USING jsonb_to_recordset(_periodos) AS p(inicio date, fim date)
   WHERE v.data BETWEEN p.inicio AND p.fim;
  INSERT INTO public.vendas_produto (data, vendedor, loja, id_produto, produto, quantidade)
  SELECT x.data, x.vendedor, x.loja, x.id_produto, max(x.produto), sum(x.quantidade)::int
    FROM jsonb_to_recordset(_linhas)
      AS x(data date, vendedor text, loja text, id_produto integer, produto text, quantidade integer)
   GROUP BY x.data, x.vendedor, x.loja, x.id_produto;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.aplicar_vendas_produto(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_vendas_produto(jsonb, jsonb) TO service_role;

-- Desempenho por produto no mês (opcionalmente de uma loja)
CREATE OR REPLACE FUNCTION public.painel_produtos(_mes date, _loja text DEFAULT NULL)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH periodo AS (
  SELECT date_trunc('month', _mes)::date AS ini, (date_trunc('month', _mes) + interval '1 month')::date AS fim
),
v AS (
  SELECT vp.* FROM public.vendas_produto vp, periodo
   WHERE vp.data >= periodo.ini AND vp.data < periodo.fim AND (_loja IS NULL OR vp.loja = _loja)
),
prod AS (
  SELECT id_produto, max(produto) AS produto, sum(quantidade)::int AS quantidade,
         count(DISTINCT vendedor)::int AS vendedores, count(DISTINCT loja)::int AS lojas
    FROM v GROUP BY id_produto
),
top_v AS (
  SELECT DISTINCT ON (id_produto) id_produto, vendedor, quantidade FROM (
    SELECT id_produto, vendedor, sum(quantidade)::int AS quantidade FROM v GROUP BY id_produto, vendedor
  ) x ORDER BY id_produto, quantidade DESC, vendedor
),
top_l AS (
  SELECT DISTINCT ON (id_produto) id_produto, loja, quantidade FROM (
    SELECT id_produto, loja, sum(quantidade)::int AS quantidade FROM v GROUP BY id_produto, loja
  ) x ORDER BY id_produto, quantidade DESC, loja
)
SELECT COALESCE(json_agg(json_build_object(
  'id_produto', p.id_produto, 'produto', p.produto, 'quantidade', p.quantidade,
  'vendedores', p.vendedores, 'lojas', p.lojas,
  'top_vendedor', tv.vendedor, 'top_vendedor_qtd', tv.quantidade,
  'top_loja', tl.loja, 'top_loja_qtd', tl.quantidade
) ORDER BY p.quantidade DESC), '[]'::json)
FROM prod p
LEFT JOIN top_v tv ON tv.id_produto = p.id_produto
LEFT JOIN top_l tl ON tl.id_produto = p.id_produto;
$$;
GRANT EXECUTE ON FUNCTION public.painel_produtos(date, text) TO anon, authenticated, service_role;

-- Extrato individual do vendedor no mês
CREATE OR REPLACE FUNCTION public.extrato_vendedor(_mes date, _vendedor text)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
WITH periodo AS (
  SELECT date_trunc('month', _mes)::date AS ini, (date_trunc('month', _mes) + interval '1 month')::date AS fim
),
v AS (
  SELECT vendas.* FROM public.vendas, periodo WHERE data >= periodo.ini AND data < periodo.fim
),
ranking AS (
  SELECT vendedor, sum(quantidade)::int AS quantidade,
         rank() OVER (ORDER BY sum(quantidade) DESC) AS posicao
    FROM v GROUP BY vendedor
),
meu AS (
  SELECT * FROM v WHERE vendedor = _vendedor
)
SELECT json_build_object(
  'vendedor', _vendedor,
  'loja', (SELECT mode() WITHIN GROUP (ORDER BY loja) FROM meu),
  'quantidade', (SELECT COALESCE(sum(quantidade), 0)::int FROM meu),
  'campanha', (SELECT COALESCE(sum(quantidade_campanha), 0)::int FROM meu),
  'posicao', (SELECT posicao FROM ranking WHERE vendedor = _vendedor),
  'total_vendedores', (SELECT count(*)::int FROM ranking),
  'dias', COALESCE((SELECT json_agg(d ORDER BY d.data DESC) FROM (
      SELECT data, sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha
        FROM meu GROUP BY data) d), '[]'::json),
  'produtos', COALESCE((SELECT json_agg(p ORDER BY p.quantidade DESC) FROM (
      SELECT vp.id_produto, max(vp.produto) AS produto, sum(vp.quantidade)::int AS quantidade
        FROM public.vendas_produto vp, periodo
       WHERE vp.vendedor = _vendedor AND vp.data >= periodo.ini AND vp.data < periodo.fim
       GROUP BY vp.id_produto) p), '[]'::json)
);
$$;
GRANT EXECUTE ON FUNCTION public.extrato_vendedor(date, text) TO anon, authenticated, service_role;

-- painel_mes: dias com venda por vendedor (selo de constância)
CREATE OR REPLACE FUNCTION public.painel_mes(_mes date)
RETURNS json
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
WITH periodo AS (
  SELECT date_trunc('month', _mes)::date AS ini,
         (date_trunc('month', _mes) + interval '1 month')::date AS fim,
         (now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje
),
v AS (
  SELECT vendas.* FROM public.vendas, periodo WHERE data >= periodo.ini AND data < periodo.fim
),
dia_destaque AS (
  SELECT COALESCE(
    (SELECT max(data) FROM public.vendas, periodo WHERE data < periodo.hoje),
    (SELECT max(data) FROM public.vendas)
  ) AS d
),
destaque AS (
  SELECT vendas.data, vendedor, mode() WITHIN GROUP (ORDER BY loja) AS loja,
         sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha
  FROM public.vendas, dia_destaque
  WHERE vendas.data = dia_destaque.d
  GROUP BY vendas.data, vendedor
  ORDER BY sum(quantidade) DESC, vendedor
  LIMIT 1
),
loja_destaque AS (
  SELECT vendas.data, loja,
         sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha,
         count(DISTINCT vendedor)::int AS vendedores
  FROM public.vendas, dia_destaque
  WHERE vendas.data = dia_destaque.d
  GROUP BY vendas.data, loja
  ORDER BY sum(quantidade) DESC, loja
  LIMIT 1
),
vend AS (
  SELECT vendedor, mode() WITHIN GROUP (ORDER BY loja) AS loja,
         sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha,
         count(DISTINCT data)::int AS dias
  FROM v GROUP BY vendedor
),
lojas AS (
  SELECT loja, sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha,
         count(DISTINCT vendedor)::int AS vendedores
  FROM v GROUP BY loja
)
SELECT json_build_object(
  'mes', (SELECT ini FROM periodo),
  'meta', (SELECT quantidade FROM public.metas, periodo WHERE mes = periodo.ini),
  'total', (SELECT COALESCE(sum(quantidade), 0)::int FROM v),
  'ultima_data', (SELECT max(data) FROM v),
  'dias_com_venda', (SELECT count(DISTINCT data)::int FROM v),
  'vendedores', COALESCE((SELECT json_agg(row_to_json(x) ORDER BY x.quantidade DESC, x.vendedor) FROM vend x), '[]'::json),
  'lojas', COALESCE((SELECT json_agg(row_to_json(l) ORDER BY l.quantidade DESC, l.loja) FROM lojas l), '[]'::json),
  'destaque', (SELECT row_to_json(d) FROM destaque d),
  'loja_destaque', (SELECT row_to_json(ld) FROM loja_destaque ld)
);
$function$;

-- Fotos dos produtos da campanha (bucket público, só admin envia)
CREATE POLICY "Admin envia fotos de produto" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'campanha-produtos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin altera fotos de produto" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'campanha-produtos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin apaga fotos de produto" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'campanha-produtos' AND public.has_role(auth.uid(), 'admin'));