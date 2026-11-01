import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Marca, Rodape } from "@/components/marca";
import { RankingLojas, RankingVendedores } from "@/components/painel/painel";
import { AbasPainel, SeloSincronizacao } from "@/components/painel/navegacao";
import { painelDiaQuery } from "@/lib/painel.functions";
import { comissaoVendedor, formatarBRL, formatarNumero } from "@/lib/comissao";
import { dataBR, diaDaSemana, hojeSP, somarDias } from "@/lib/datas";

export const Route = createFileRoute("/dia")({
  validateSearch: (search: Record<string, unknown>): { data?: string | undefined } => {
    const d = search["data"];
    return { data: typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined };
  },
  loaderDeps: ({ search }) => ({ data: search.data }),
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(painelDiaQuery(deps.data ?? hojeSP())),
  head: () => ({
    meta: [
      { title: "Vendas do Dia · Ativa PDV" },
      { name: "description", content: "Ranking de vendedores e lojas do dia, com filtro por data, loja e vendedor." },
      { property: "og:title", content: "Vendas do Dia · Ativa PDV" },
      { property: "og:description", content: "Ranking de vendedores e lojas do dia, com filtro por data, loja e vendedor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dia,
});

function Dia() {
  const busca = Route.useSearch();
  const navigate = useNavigate({ from: "/dia" });
  const hoje = hojeSP();
  const data = busca.data ?? hoje;
  const { data: dia } = useSuspenseQuery(painelDiaQuery(data));
  const [loja, setLoja] = useState("");
  const [texto, setTexto] = useState("");

  const irPara = (d: string) => navigate({ search: { data: d === hoje ? undefined : d } });

  const vendedores = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return dia.vendedores.filter(
      (v) => (!loja || v.loja === loja) && (!t || v.vendedor.toLowerCase().includes(t)),
    );
  }, [dia.vendedores, loja, texto]);
  const lojas = loja ? dia.lojas.filter((l) => l.loja === loja) : dia.lojas;
  const total = vendedores.reduce((s, v) => s + v.quantidade, 0);
  const comissao = vendedores.reduce((s, v) => s + comissaoVendedor(v.quantidade, v.campanha), 0);
  const campo = "h-10 rounded-full border border-border bg-card/70 px-4 text-sm outline-none focus:border-sun";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Marca />
        <Link
          to="/admin"
          className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground sm:flex"
        >
          <Upload className="size-4" /> Lançar vendas
        </Link>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <AbasPainel ativa="dia" />
        <SeloSincronizacao />
      </div>

      <div className="mt-8">
        <h1 className="font-display text-3xl font-black uppercase leading-[1.05] md:text-6xl">
          Vendas do <span className="text-fire">dia</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {diaDaSemana(data)}, {dataBR(data)}
          {data === hoje && " · hoje"}
        </p>
      </div>

      <section className="surface mt-8 flex flex-wrap items-center gap-3 p-4">
        <div className="flex items-center rounded-full border border-border bg-card/70 p-1">
          <button type="button" aria-label="Dia anterior" onClick={() => irPara(somarDias(data, -1))} className="flex size-8 items-center justify-center rounded-full hover:bg-secondary">
            <ChevronLeft className="size-4" />
          </button>
          <input
            type="date"
            aria-label="Data"
            value={data}
            max={hoje}
            onChange={(e) => e.target.value && irPara(e.target.value)}
            className="bg-transparent px-2 text-sm font-bold outline-none [color-scheme:dark]"
          />
          <button type="button" aria-label="Próximo dia" disabled={data >= hoje} onClick={() => irPara(somarDias(data, 1))} className="flex size-8 items-center justify-center rounded-full hover:bg-secondary disabled:opacity-30">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button type="button" onClick={() => irPara(hoje)} className={campo}>Hoje</button>
        <button type="button" onClick={() => irPara(somarDias(hoje, -1))} className={campo}>Ontem</button>
        <select aria-label="Loja" value={loja} onChange={(e) => setLoja(e.target.value)} className={campo}>
          <option value="">Todas as lojas</option>
          {dia.lojas.map((l) => (
            <option key={l.loja} value={l.loja}>{l.loja}</option>
          ))}
        </select>
        <label className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Buscar vendedor"
            placeholder="Buscar vendedor"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${campo} w-full pl-9`}
          />
        </label>
      </section>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <Numero rotulo="Unidades no dia" valor={formatarNumero(total)} />
        <Numero rotulo="Vendedores com venda" valor={formatarNumero(vendedores.length)} />
        <Numero rotulo="Comissão dos vendedores" valor={formatarBRL(comissao)} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <RankingVendedores vendedores={vendedores} mes={data} titulo="Ranking de vendedores do dia" vazio="Nenhuma venda encontrada para este dia." />
        <RankingLojas lojas={lojas} mes={data} titulo="Ranking das lojas do dia" vazio="Nenhuma venda encontrada para este dia." />
      </div>
      <Rodape />
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="surface p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{rotulo}</p>
      <p className="mt-2 font-display text-3xl font-black">{valor}</p>
    </div>
  );
}
