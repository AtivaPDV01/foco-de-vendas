CREATE OR REPLACE FUNCTION public.painel_mes(_mes date) RETURNS json LANGUAGE sql STABLE SET search_path = public AS $$
WITH periodo AS (
  SELECT date_trunc('month', _mes)::date AS ini,
         (date_trunc('month', _mes) + interval '1 month')::date AS fim,
         (now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje
),
v AS (SELECT vendas.* FROM public.vendas, periodo WHERE data >= periodo.ini AND data < periodo.fim),
dia_destaque AS (
  SELECT COALESCE((SELECT max(data) FROM public.vendas, periodo WHERE data < periodo.hoje),(SELECT max(data) FROM public.vendas)) AS d
),
destaque AS (
  SELECT vendas.data, vendedor, loja, sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha
  FROM public.vendas, dia_destaque WHERE vendas.data = dia_destaque.d
  GROUP BY vendas.data, vendedor, loja ORDER BY sum(quantidade) DESC, vendedor LIMIT 1
),
loja_destaque AS (
  SELECT vendas.data, loja, sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha,
         count(DISTINCT vendedor)::int AS vendedores
  FROM public.vendas, dia_destaque WHERE vendas.data = dia_destaque.d
  GROUP BY vendas.data, loja ORDER BY sum(quantidade) DESC, loja LIMIT 1
),
vend AS (
  SELECT vendedor, loja, sum(quantidade)::int AS quantidade, sum(quantidade_campanha)::int AS campanha,
         count(DISTINCT data)::int AS dias
  FROM v GROUP BY vendedor, loja
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
  'vendedores', COALESCE((SELECT json_agg(row_to_json(x) ORDER BY x.quantidade DESC, x.vendedor, x.loja) FROM vend x), '[]'::json),
  'lojas', COALESCE((SELECT json_agg(row_to_json(l) ORDER BY l.quantidade DESC, l.loja) FROM lojas l), '[]'::json),
  'destaque', (SELECT row_to_json(d) FROM destaque d),
  'loja_destaque', (SELECT row_to_json(ld) FROM loja_destaque ld)
);
$$;

CREATE OR REPLACE FUNCTION public.painel_dia(_data date) RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select json_build_object(
    'data', _data,
    'total', coalesce((select sum(quantidade) from vendas where data = _data), 0),
    'campanha', coalesce((select sum(quantidade_campanha) from vendas where data = _data), 0),
    'vendedores', coalesce((select json_agg(v order by v.quantidade desc, v.vendedor, v.loja) from (
        select vendedor, loja, sum(quantidade)::int as quantidade, sum(quantidade_campanha)::int as campanha
        from vendas where data = _data group by vendedor, loja) v), '[]'::json),
    'lojas', coalesce((select json_agg(l order by l.quantidade desc, l.loja) from (
        select loja, sum(quantidade)::int as quantidade, sum(quantidade_campanha)::int as campanha, count(distinct vendedor)::int as vendedores
        from vendas where data = _data group by loja) l), '[]'::json),
    'ultima_sincronizacao', (select max(concluido_em) from sincronizacoes where status = 'ok')
  );
$$;

CREATE OR REPLACE FUNCTION public.snapshot_ranking(_data date) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _mes date := date_trunc('month', _data)::date;
BEGIN
  DELETE FROM ranking_snapshot WHERE data = _data;
  INSERT INTO ranking_snapshot (data, tipo, id, posicao, unidades)
  SELECT _data, 'vendedor', vendedor || '|' || loja,
         row_number() OVER (ORDER BY sum(quantidade) DESC, vendedor, loja),
         sum(quantidade)::integer
  FROM vendas WHERE data >= _mes AND data <= _data
  GROUP BY vendedor, loja;
  INSERT INTO ranking_snapshot (data, tipo, id, posicao, unidades)
  SELECT _data, 'loja', loja,
         row_number() OVER (ORDER BY sum(quantidade) DESC, loja),
         sum(quantidade)::integer
  FROM vendas WHERE data >= _mes AND data <= _data
  GROUP BY loja;
  RETURN 1;
END;
$$;