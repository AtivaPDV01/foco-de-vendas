-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê os próprios papéis" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- O primeiro usuário cadastrado vira administrador
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_first_admin
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

-- Importações
CREATE TABLE public.importacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo text NOT NULL,
  linhas integer NOT NULL DEFAULT 0,
  unidades integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.importacoes TO authenticated;
GRANT ALL ON public.importacoes TO service_role;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia importações" ON public.importacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Vendas
CREATE TABLE public.vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  importacao_id uuid REFERENCES public.importacoes(id) ON DELETE CASCADE,
  data date NOT NULL,
  vendedor text NOT NULL,
  loja text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vendas_data_idx ON public.vendas (data);
GRANT SELECT ON public.vendas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas TO authenticated;
GRANT ALL ON public.vendas TO service_role;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem vendas" ON public.vendas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insere vendas" ON public.vendas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin altera vendas" ON public.vendas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin apaga vendas" ON public.vendas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Metas mensais (em unidades)
CREATE TABLE public.metas (
  mes date PRIMARY KEY,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.metas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated;
GRANT ALL ON public.metas TO service_role;
ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem metas" ON public.metas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin insere metas" ON public.metas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin altera metas" ON public.metas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin apaga metas" ON public.metas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Painel do mês: tudo agregado em uma chamada
CREATE OR REPLACE FUNCTION public.painel_mes(_mes date)
RETURNS json LANGUAGE sql STABLE SET search_path = public AS $$
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
  SELECT vendas.data, vendedor, mode() WITHIN GROUP (ORDER BY loja) AS loja, sum(quantidade)::int AS quantidade
  FROM public.vendas, dia_destaque
  WHERE vendas.data = dia_destaque.d
  GROUP BY vendas.data, vendedor
  ORDER BY sum(quantidade) DESC, vendedor
  LIMIT 1
),
vend AS (
  SELECT vendedor, mode() WITHIN GROUP (ORDER BY loja) AS loja, sum(quantidade)::int AS quantidade
  FROM v GROUP BY vendedor
),
lojas AS (
  SELECT loja, sum(quantidade)::int AS quantidade, count(DISTINCT vendedor)::int AS vendedores
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
$$;
GRANT EXECUTE ON FUNCTION public.painel_mes(date) TO anon, authenticated;
