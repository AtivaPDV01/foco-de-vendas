ALTER TABLE public.vendas ADD COLUMN IF NOT EXISTS quantidade_campanha integer NOT NULL DEFAULT 0;
ALTER TABLE public.vendas ADD CONSTRAINT vendas_quantidade_campanha_valida CHECK (quantidade_campanha >= 0 AND quantidade_campanha <= quantidade);
COMMENT ON COLUMN public.vendas.quantidade IS 'Total de unidades vendidas (conta para meta e ranking).';
COMMENT ON COLUMN public.vendas.quantidade_campanha IS 'Quantas das unidades em quantidade pagam a comissão reduzida da campanha.';

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
vend AS (
  SELECT vendedor, mode() WITHIN GROUP (ORDER BY loja) AS loja,
         sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha
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
  'vendedores', COALESCE((SELECT json_agg(row_to_json(x) ORDER BY x.quantidade DESC, x.vendedor) FROM vend x), '[]'::json),
  'lojas', COALESCE((SELECT json_agg(row_to_json(l) ORDER BY l.quantidade DESC, l.loja) FROM lojas l), '[]'::json),
  'destaque', (SELECT row_to_json(d) FROM destaque d)
);
$function$;