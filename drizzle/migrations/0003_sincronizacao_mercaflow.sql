-- Histórico das sincronizações automáticas/manuais com o Mercaflow
CREATE TABLE public.sincronizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL DEFAULT 'mercaflow',
  gatilho text NOT NULL CHECK (gatilho IN ('manual', 'automatico')),
  status text NOT NULL DEFAULT 'executando' CHECK (status IN ('executando', 'ok', 'erro')),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  linhas integer,
  unidades integer,
  campanhas text[],
  mensagem text
);
CREATE INDEX sincronizacoes_iniciado_idx ON public.sincronizacoes (origem, iniciado_em DESC);
GRANT SELECT ON public.sincronizacoes TO authenticated;
GRANT ALL ON public.sincronizacoes TO service_role;
ALTER TABLE public.sincronizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê sincronizações" ON public.sincronizacoes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Substitui, de forma atômica, as vendas da importação "Sincronização Mercaflow"
-- dentro dos períodos das campanhas lidas, e insere as linhas novas.
CREATE OR REPLACE FUNCTION public.aplicar_sincronizacao_mercaflow(_periodos jsonb, _linhas jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _imp uuid;
  _linhas_imp integer;
  _unidades_imp integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sincronizacao_mercaflow'));

  SELECT id INTO _imp FROM public.importacoes
   WHERE arquivo = 'Sincronização Mercaflow'
   ORDER BY created_at LIMIT 1;
  IF _imp IS NULL THEN
    INSERT INTO public.importacoes (arquivo) VALUES ('Sincronização Mercaflow') RETURNING id INTO _imp;
  END IF;

  DELETE FROM public.vendas v
   USING jsonb_to_recordset(_periodos) AS p(inicio date, fim date)
   WHERE v.importacao_id = _imp AND v.data BETWEEN p.inicio AND p.fim;

  INSERT INTO public.vendas (importacao_id, data, vendedor, loja, quantidade, quantidade_campanha)
  SELECT _imp, x.data, x.vendedor, x.loja, x.quantidade, x.quantidade_campanha
    FROM jsonb_to_recordset(_linhas)
      AS x(data date, vendedor text, loja text, quantidade integer, quantidade_campanha integer);

  SELECT count(*)::int, COALESCE(sum(quantidade), 0)::int
    INTO _linhas_imp, _unidades_imp
    FROM public.vendas WHERE importacao_id = _imp;
  UPDATE public.importacoes SET linhas = _linhas_imp, unidades = _unidades_imp WHERE id = _imp;

  RETURN jsonb_build_object('importacao_id', _imp, 'linhas', _linhas_imp, 'unidades', _unidades_imp);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.aplicar_sincronizacao_mercaflow(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_sincronizacao_mercaflow(jsonb, jsonb) TO service_role;