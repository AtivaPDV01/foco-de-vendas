import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import { Marca } from "@/components/marca";
import {
  DestaqueCard,
  MetaCard,
  Podio,
  RankingLojas,
  RankingVendedores,
} from "@/components/painel/painel";
import { painelQuery } from "@/lib/painel.functions";
import { dataBR, mesAtualSP, nomeMes, somarMes } from "@/lib/datas";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { mes?: string } => ({
    mes:
      typeof search.mes === "string" && /^\d{4}-\d{2}$/.test(search.mes) ? search.mes : undefined,
  }),
  loaderDeps: ({ search }) => ({ mes: search.mes }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(painelQuery(deps.mes)),
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
  const { mes: mesBusca } = Route.useSearch();
  const { data: painel } = useSuspenseQuery(painelQuery(mesBusca));
  const mes = painel.mes.slice(0, 7);
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
              search={{ mes: anterior }}
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
                search={{ mes: proximo }}
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

      <div className="mt-10 md:mt-14">
        <h1 className="font-display text-3xl font-black leading-[1.05] md:text-6xl">
          Quem está <span className="text-fire">pegando fogo</span>
          <br className="hidden md:block" /> em {nomeMes(mes).split(" ")[0].toLowerCase()}?
        </h1>
        {painel.ultima_data && (
          <p className="mt-3 text-sm text-muted-foreground">
            Atualizado com vendas até {dataBR(painel.ultima_data)}
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <MetaCard painel={painel} />
        <DestaqueCard destaque={painel.destaque} />
      </div>

      <div className="mt-5">
        <Podio vendedores={painel.vendedores} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <RankingVendedores vendedores={painel.vendedores} />
        <RankingLojas lojas={painel.lojas} />
      </div>
    </div>
  );
}
