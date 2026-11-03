import { createFileRoute, Link } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Store, Upload } from "lucide-react";
import { useMemo } from "react";
import { Marca, Rodape } from "@/components/marca";
import {
  DestaqueCard,
  LojaDestaqueCard,
  MetaCard,
  Podio,
  RankingLojas,
  RankingVendedores,
} from "@/components/painel/painel";
import { AbasPainel, SeloSincronizacao } from "@/components/painel/navegacao";
import { ItensCampanha } from "@/components/painel/itens-campanha";
import { CompartilharPodio } from "@/components/painel/compartilhar";
import { DesempenhoProdutos } from "@/components/painel/produtos";
import { selosDoRanking } from "@/lib/conquistas";
import { campanhaQuery, painelQuery, produtosQuery } from "@/lib/painel.functions";
import { dataBR, mesAtualSP, nomeMes, somarMes } from "@/lib/datas";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { mes?: string | undefined; loja?: string | undefined } => {
    const mes = search["mes"];
    const loja = search["loja"];
    return {
      mes: typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes : undefined,
      loja: typeof loja === "string" && loja.trim() ? loja.slice(0, 200) : undefined,
    };
  },
  loaderDeps: ({ search }) => ({ mes: search.mes }),
  loader: async ({ context, deps }) => {
    const mes = deps.mes ?? mesAtualSP();
    await Promise.all([
      context.queryClient.ensureQueryData(painelQuery(deps.mes)),
      context.queryClient.ensureQueryData(campanhaQuery(mes)),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Ranking de Vendas · Ativa PDV" },
      {
        name: "description",
        content: "Pódio dos vendedores, ranking das lojas, comissões e progresso da meta do mês.",
      },
      { property: "og:title", content: "Ranking de Vendas · Ativa PDV" },
      {
        property: "og:description",
        content: "Pódio dos vendedores, ranking das lojas, comissões e progresso da meta do mês.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { mes: mesBusca, loja } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: painel } = useSuspenseQuery(painelQuery(mesBusca));
  const mes = painel.mes.slice(0, 7);
  const { data: campanha } = useSuspenseQuery(campanhaQuery(mes));
  const lojaValida = loja && painel.lojas.some((l) => l.loja === loja) ? loja : undefined;
  const { data: produtos } = useQuery({ ...produtosQuery(mes, lojaValida), placeholderData: keepPreviousData });
  const selos = useMemo(
    () =>
      selosDoRanking(painel.vendedores, {
        destaqueDoDia: painel.destaque?.vendedor,
        diasComVenda: painel.dias_com_venda,
      }),
    [painel],
  );
  const vendedores = lojaValida ? painel.vendedores.filter((v) => v.loja === lojaValida) : painel.vendedores;
  const anterior = somarMes(mes, -1);
  const proximo = somarMes(mes, 1);
  const podeAvancar = proximo <= mesAtualSP();

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Marca />
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-card/70 p-1">
            <Link
              to="/"
              search={{ mes: anterior, loja }}
              aria-label="Mês anterior"
              className="flex size-8 items-center justify-center rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-36 px-2 text-center font-display text-sm font-bold">
              {nomeMes(mes)}
            </span>
            {podeAvancar ? (
              <Link
                to="/"
                search={{ mes: proximo, loja }}
                aria-label="Próximo mês"
                className="flex size-8 items-center justify-center rounded-full hover:bg-secondary"
              >
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full opacity-30">
                <ChevronRight className="size-4" />
              </span>
            )}
          </div>
          <Link
            to="/admin"
            className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:flex"
          >
            <Upload className="size-4" /> Lançar vendas
          </Link>
        </div>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <AbasPainel ativa="mes" />
        <SeloSincronizacao />
      </div>

      {campanha && (
        <div className="mt-6">
          <ItensCampanha campanha={campanha} />
        </div>
      )}

      <div className="mt-8">
        <h1 className="font-display text-3xl font-black uppercase leading-[1.05] md:text-6xl">
          Veja os <span className="text-fire">destaques</span>
          <br className="hidden md:block" /> da nossa <span className="text-fire">campanha</span>
        </h1>
        {painel.ultima_data && (
          <p className="mt-3 text-sm text-muted-foreground">
            Atualizado com vendas até {dataBR(painel.ultima_data)}
          </p>
        )}
      </div>

      <div className="mt-8">
        <MetaCard painel={painel} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DestaqueCard destaque={painel.destaque} />
        <LojaDestaqueCard loja={painel.loja_destaque} />
      </div>
      {painel.destaque && (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <p className="text-xs text-muted-foreground">Mande o pódio do dia no grupo da equipe</p>
          <CompartilharPodio data={painel.destaque.data} />
        </div>
      )}

      <section className="surface mt-8 flex flex-wrap items-center gap-3 p-4">
        <Store className="size-4 text-sun" />
        <label htmlFor="filtro-loja" className="text-sm font-bold">
          Ver ranking da loja
        </label>
        <select
          id="filtro-loja"
          value={lojaValida ?? ""}
          onChange={(e) => navigate({ search: (s) => ({ ...s, loja: e.target.value || undefined }), replace: true })}
          className="h-10 min-w-52 flex-1 rounded-full border border-border bg-card/70 px-4 text-sm outline-none focus:border-sun sm:flex-none"
        >
          <option value="">Todas as lojas</option>
          {painel.lojas.map((l) => (
            <option key={l.loja} value={l.loja}>
              {l.loja}
            </option>
          ))}
        </select>
        {lojaValida && (
          <button
            type="button"
            onClick={() => navigate({ search: (s) => ({ ...s, loja: undefined }), replace: true })}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Limpar filtro
          </button>
        )}
      </section>

      <div className="mt-5">
        <Podio vendedores={vendedores} titulo={lojaValida ? `Pódio · ${lojaValida}` : "Pódio geral"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <RankingVendedores
          vendedores={vendedores}
          mes={mes}
          selos={selos}
          titulo={lojaValida ? `Vendedores · ${lojaValida}` : "Ranking geral de vendedores"}
          vazio={lojaValida ? "Sem vendas desta loja no mês." : "Sem vendas neste mês."}
        />
        <RankingLojas lojas={painel.lojas} mes={mes} />
      </div>

      {(produtos?.length || campanha?.itens.length) ? (
        <div className="mt-5">
          <DesempenhoProdutos campanha={campanha} vendas={produtos ?? []} loja={lojaValida} />
        </div>
      ) : null}
      <Rodape />
    </div>
  );
}
