import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Store, Upload, Users } from "lucide-react";
import { Marca, Rodape } from "@/components/marca";
import { AbasPainel, SeloSincronizacao } from "@/components/painel/navegacao";
import { MetaCard, Podio, RankingVendedores } from "@/components/painel/painel";
import { DesempenhoProdutos } from "@/components/painel/produtos";
import { comissaoLoja, formatarBRL, formatarNumero } from "@/lib/comissao";
import { selosDoRanking } from "@/lib/conquistas";
import { mesAtualSP, nomeMes, somarMes } from "@/lib/datas";
import { campanhaQuery, metasLojaQuery, painelQuery, produtosQuery, type Campanha, type MetaLoja, type Painel } from "@/lib/painel.functions";

const CHAVE_LOJA = "ativa-pdv:minha-loja";

export const Route = createFileRoute("/loja")({
  validateSearch: (search: Record<string, unknown>): { loja?: string | undefined; mes?: string | undefined } => {
    const l = search["loja"];
    const mes = search["mes"];
    return {
      loja: typeof l === "string" && l.trim() ? l.slice(0, 200) : undefined,
      mes: typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes : undefined,
    };
  },
  loaderDeps: ({ search }) => ({ mes: search.mes }),
  loader: async ({ context, deps }) => {
    const mes = deps.mes ?? mesAtualSP();
    await Promise.all([
      context.queryClient.ensureQueryData(painelQuery(deps.mes)),
      context.queryClient.ensureQueryData(metasLojaQuery(mes)),
      context.queryClient.ensureQueryData(campanhaQuery(mes)),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Minha loja · Ativa PDV" },
      { name: "description", content: "Desempenho da loja no mês: meta da loja, ritmo, projeção, ranking interno e produtos vendidos." },
      { property: "og:title", content: "Minha loja · Ativa PDV" },
      { property: "og:description", content: "Desempenho da loja no mês: meta da loja, ritmo, projeção, ranking interno e produtos vendidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LojaPage,
});

function LojaPage() {
  const busca = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: painel } = useSuspenseQuery(painelQuery(busca.mes));
  const mes = painel.mes.slice(0, 7);
  const { data: metas } = useSuspenseQuery(metasLojaQuery(mes));
  const { data: campanha } = useSuspenseQuery(campanhaQuery(mes));
  const anterior = somarMes(mes, -1);
  const proximo = somarMes(mes, 1);
  const podeAvancar = proximo <= mesAtualSP();

  const nomes = Array.from(new Set([...painel.lojas.map((l) => l.loja), ...metas.map((m) => m.loja)])).sort((a, b) =>
    a.localeCompare(b),
  );
  const loja = busca.loja;

  const escolher = (nome: string | undefined) => {
    if (nome) localStorage.setItem(CHAVE_LOJA, nome);
    else localStorage.removeItem(CHAVE_LOJA);
    navigate({ search: (s) => ({ ...s, loja: nome }) });
  };

  useEffect(() => {
    if (busca.loja) return;
    const salvo = localStorage.getItem(CHAVE_LOJA);
    if (salvo) navigate({ search: (s) => ({ ...s, loja: salvo }), replace: true });
  }, [busca.loja, navigate]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Marca />
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-card/70 p-1">
            <Link to="/loja" search={{ mes: anterior, loja }} aria-label="Mês anterior" className="flex size-8 items-center justify-center rounded-full hover:bg-secondary">
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-36 px-2 text-center font-display text-sm font-bold">{nomeMes(mes)}</span>
            {podeAvancar ? (
              <Link to="/loja" search={{ mes: proximo, loja }} aria-label="Próximo mês" className="flex size-8 items-center justify-center rounded-full hover:bg-secondary">
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full opacity-30">
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
          <Link to="/admin" className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:flex">
            <Upload className="size-4" /> Lançar vendas
          </Link>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <AbasPainel ativa="loja" />
        <SeloSincronizacao />
      </div>

      <div className="mt-8">
        <h1 className="font-display text-3xl font-black uppercase leading-[1.05] md:text-6xl">
          Minha <span className="text-fire">loja</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Escolha sua loja para ver a meta, o ritmo e o ranking dos vendedores dela.</p>
      </div>

      <section className="surface mt-6 flex flex-wrap items-center gap-3 p-4">
        <Store className="size-4 text-sun" />
        <label htmlFor="escolher-loja" className="text-sm font-bold">Loja</label>
        <select
          id="escolher-loja"
          value={loja ?? ""}
          onChange={(e) => escolher(e.target.value || undefined)}
          className="h-10 min-w-52 flex-1 rounded-full border border-border bg-card/70 px-4 text-sm outline-none focus:border-sun sm:flex-none"
        >
          <option value="">Selecione a loja</option>
          {loja && !nomes.includes(loja) && <option value={loja}>{loja}</option>}
          {nomes.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </section>

      {loja && <DesempenhoLoja loja={loja} mes={mes} painel={painel} metas={metas} campanha={campanha} />}
      <Rodape />
    </div>
  );
}

function DesempenhoLoja({
  loja,
  mes,
  painel,
  metas,
  campanha,
}: {
  loja: string;
  mes: string;
  painel: Painel;
  metas: MetaLoja[];
  campanha: Campanha | null;
}) {
    const dados = painel.lojas.find((l) => l.loja === loja);
    const meta = metas.find((m) => m.loja === loja)?.quantidade ?? null;
    const vendedores = painel.vendedores.filter((v) => v.loja === loja);
    const selos = selosDoRanking(painel.vendedores, { destaqueDoDia: painel.destaque?.vendedor, diasComVenda: painel.dias_com_venda });
    const { data: produtos } = useQuery(produtosQuery(mes, loja));
    const total = dados?.quantidade ?? 0;
    const posicao = dados ? painel.lojas.findIndex((l) => l.loja === loja) + 1 : null;

    return (
      <>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Resumo rotulo="Vendido pela loja" valor={`${formatarNumero(total)} un.`} />
          <Resumo rotulo="Comissão da loja" valor={formatarBRL(comissaoLoja(total, dados?.campanha ?? 0))} />
          <Resumo
            rotulo="Posição entre as lojas"
            valor={posicao ? `${posicao}º de ${painel.lojas.length}` : "—"}
            icone={<Users className="size-4 text-sun" />}
          />
        </div>
        <div className="mt-5">
          <MetaCard painel={{ ...painel, total, meta }} titulo={`Meta da loja · ${loja}`} />
        </div>
        <div className="mt-5">
          <Podio vendedores={vendedores} titulo={`Pódio · ${loja}`} />
        </div>
        <div className="mt-5">
          <RankingVendedores vendedores={vendedores} mes={mes} selos={selos} titulo={`Vendedores · ${loja}`} vazio="Sem vendas desta loja no mês." />
        </div>
        {(produtos?.length || campanha?.itens.length) ? (
          <div className="mt-5">
            <DesempenhoProdutos campanha={campanha} vendas={produtos ?? []} loja={loja} />
          </div>
        ) : null}
      </>
    );
}

function Resumo({ rotulo, valor, icone }: { rotulo: string; valor: string; icone?: ReactNode }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {icone ?? <Store className="size-4 text-sun" />} {rotulo}
      </div>
      <p className="mt-2 font-display text-2xl font-black">{valor}</p>
    </div>
  );
}
