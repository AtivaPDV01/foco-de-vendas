import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Calculator, CalendarDays, ChevronLeft, ChevronRight, Medal, Package, Rocket, Search, Upload, UserRound, X } from "lucide-react";
import { Marca, Rodape } from "@/components/marca";
import { AbasPainel, SeloSincronizacao } from "@/components/painel/navegacao";
import { iniciais, Selos, Variacao } from "@/components/painel/painel";
import { Slider } from "@/components/ui/slider";
import { comissaoVendedor, formatarBRL, formatarNumero, ritmoMeta } from "@/lib/comissao";
import { FAIXAS, faixaDe, posicaoCom, proximaFaixa, selosDoRanking } from "@/lib/conquistas";
import { dataBR, diaDaSemana, diasNoMes, hojeSP, mesAtualSP, nomeMes, somarMes } from "@/lib/datas";
import { extratoQuery, painelQuery, variacoesQuery, type Painel } from "@/lib/painel.functions";
import { cn } from "@/lib/utils";

const CHAVE_NOME = "ativa-pdv:meu-nome";

export const Route = createFileRoute("/extrato")({
  validateSearch: (search: Record<string, unknown>): { vendedor?: string | undefined; mes?: string | undefined } => {
    const v = search["vendedor"];
    const mes = search["mes"];
    return {
      vendedor: typeof v === "string" && v.trim() ? v.slice(0, 200) : undefined,
      mes: typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes : undefined,
    };
  },
  loaderDeps: ({ search }) => ({ mes: search.mes, vendedor: search.vendedor }),
  loader: async ({ context, deps }) => {
    const mes = deps.mes ?? mesAtualSP();
    await Promise.all([
      context.queryClient.ensureQueryData(painelQuery(deps.mes)),
      deps.vendedor ? context.queryClient.ensureQueryData(extratoQuery(mes, deps.vendedor)) : null,
    ]);
  },
  head: () => ({
    meta: [
      { title: "Meu extrato de comissão · Ativa PDV" },
      {
        name: "description",
        content: "Veja suas vendas, a comissão acumulada no mês, sua faixa de conquista e simule quanto pode ganhar.",
      },
      { property: "og:title", content: "Meu extrato de comissão · Ativa PDV" },
      {
        property: "og:description",
        content: "Veja suas vendas, a comissão acumulada no mês, sua faixa de conquista e simule quanto pode ganhar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExtratoPage,
});

function ExtratoPage() {
  const busca = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: painel } = useSuspenseQuery(painelQuery(busca.mes));
  const mes = painel.mes.slice(0, 7);
  const anterior = somarMes(mes, -1);
  const proximo = somarMes(mes, 1);
  const podeAvancar = proximo <= mesAtualSP();

  const escolher = (nome: string | undefined) => {
    if (nome) localStorage.setItem(CHAVE_NOME, nome);
    else localStorage.removeItem(CHAVE_NOME);
    navigate({ search: (s) => ({ ...s, vendedor: nome }) });
  };

  // Lembra o nome escolhido neste aparelho.
  useEffect(() => {
    if (busca.vendedor) return;
    const salvo = localStorage.getItem(CHAVE_NOME);
    if (salvo) navigate({ search: (s) => ({ ...s, vendedor: salvo }), replace: true });
  }, [busca.vendedor, navigate]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Marca />
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-card/70 p-1">
            <Link
              to="/extrato"
              search={{ mes: anterior, vendedor: busca.vendedor }}
              aria-label="Mês anterior"
              className="flex size-8 items-center justify-center rounded-full hover:bg-secondary"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-36 px-2 text-center font-display text-sm font-bold">{nomeMes(mes)}</span>
            {podeAvancar ? (
              <Link
                to="/extrato"
                search={{ mes: proximo, vendedor: busca.vendedor }}
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
        <AbasPainel ativa="extrato" />
        <SeloSincronizacao />
      </div>

      <div className="mt-8">
        <h1 className="font-display text-3xl font-black uppercase leading-[1.05] md:text-6xl">
          Meu <span className="text-fire">extrato</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Escolha seu nome para ver suas vendas, sua comissão e o que falta para a próxima faixa.
        </p>
      </div>

      <EscolherVendedor
        nomes={painel.vendedores.map((v) => v.vendedor)}
        atual={busca.vendedor}
        aoEscolher={escolher}
      />

      {busca.vendedor && <Extrato vendedor={busca.vendedor} mes={mes} painel={painel} />}
      <Rodape />
    </div>
  );
}

function EscolherVendedor({
  nomes,
  atual,
  aoEscolher,
}: {
  nomes: string[];
  atual: string | undefined;
  aoEscolher: (nome: string | undefined) => void;
}) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const sugestoes = useMemo(() => {
    const t = texto.trim().toLowerCase();
    const lista = [...nomes].sort((a, b) => a.localeCompare(b, "pt-BR"));
    return (t ? lista.filter((n) => n.toLowerCase().includes(t)) : lista).slice(0, 30);
  }, [nomes, texto]);

  if (atual && !aberto) {
    return (
      <div className="surface mt-6 flex flex-wrap items-center gap-3 p-4">
        <UserRound className="size-4 text-sun" />
        <span className="text-sm text-muted-foreground">Vendo o extrato de</span>
        <span className="font-bold">{atual}</span>
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="ml-auto rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Trocar nome
        </button>
      </div>
    );
  }

  return (
    <section className="surface mt-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            autoFocus={aberto}
            aria-label="Buscar seu nome"
            placeholder="Digite seu nome"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="h-11 w-full rounded-full border border-border bg-card/70 pl-9 pr-4 text-sm outline-none focus:border-sun"
          />
        </label>
        {atual && (
          <button
            type="button"
            aria-label="Cancelar"
            onClick={() => setAberto(false)}
            className="flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {nomes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Ainda não há vendas neste mês.</p>
      ) : (
        <ul className="mt-4 flex max-h-72 flex-wrap gap-2 overflow-y-auto">
          {sugestoes.map((n) => (
            <li key={n}>
              <button
                type="button"
                onClick={() => {
                  aoEscolher(n);
                  setAberto(false);
                  setTexto("");
                }}
                className={cn(
                  "rounded-full border border-border bg-muted/40 px-3 py-1.5 text-sm font-semibold hover:border-sun",
                  n === atual && "border-sun text-sun",
                )}
              >
                {n}
              </button>
            </li>
          ))}
          {sugestoes.length === 0 && <li className="text-sm text-muted-foreground">Nenhum nome encontrado.</li>}
        </ul>
      )}
    </section>
  );
}

function Extrato({ vendedor, mes, painel }: { vendedor: string; mes: string; painel: Painel }) {
  const { data: extrato } = useQuery(extratoQuery(mes, vendedor));
  const { data: variacoes } = useQuery(variacoesQuery(mes));
  const [extra, setExtra] = useState(100);

  if (!extrato) return null;
  const qtd = extrato.quantidade;
  const comissao = comissaoVendedor(qtd, extrato.campanha);
  const faixa = faixaDe(qtd);
  const prox = proximaFaixa(qtd);
  const selos = selosDoRanking(painel.vendedores, {
    destaqueDoDia: painel.destaque?.vendedor,
    diasComVenda: painel.dias_com_venda,
  }).get(vendedor);
  const ehMesAtual = mes === mesAtualSP();
  const totalDias = diasNoMes(mes);
  const ritmo = ritmoMeta(qtd, null, ehMesAtual ? Number(hojeSP().slice(8, 10)) : totalDias, totalDias);
  const campanhaProjetada = qtd > 0 ? Math.round((extrato.campanha / qtd) * ritmo.projecao) : 0;
  const comissaoProjetada = comissaoVendedor(ritmo.projecao, campanhaProjetada);

  // Simulador: as unidades extras pagam o valor normal por unidade.
  const simulado = qtd + extra;
  const comissaoSimulada = comissaoVendedor(simulado, extrato.campanha);
  const faixaSimulada = faixaDe(simulado);
  const posicaoSimulada = posicaoCom(simulado, vendedor, painel.vendedores);
  const maiorDia = Math.max(...extrato.dias.map((d) => d.quantidade), 1);

  if (qtd === 0) {
    return (
      <div className="surface mt-5 p-6 text-sm text-muted-foreground">
        {vendedor} ainda não tem vendas em {nomeMes(mes)}.
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-5">
      <ProgressoPessoal
        vendedor={vendedor}
        painel={painel}
        qtd={qtd}
        comissao={comissao}
        posicao={extrato.posicao}
        anterior={variacoes?.vendedores[vendedor]}
      />
      <section className="surface glow ring-fire relative overflow-hidden p-6 md:p-8">
        <div className="bg-fire pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="bg-fire glow-sun flex size-16 shrink-0 items-center justify-center rounded-full font-display text-xl font-extrabold text-accent-foreground">
            {iniciais(vendedor)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-2xl font-bold md:text-3xl">{vendedor}</p>
            <p className="text-sm text-muted-foreground">{extrato.loja}</p>
            <Selos selos={selos} className="mt-2" />
          </div>
          {extrato.posicao && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Posição no ranking</p>
              <p className="font-display text-4xl font-black">
                <span className="text-fire">{extrato.posicao}º</span>
              </p>
              <p className="text-xs text-muted-foreground">de {extrato.total_vendedores}</p>
            </div>
          )}
        </div>
        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <Caixa rotulo="Unidades no mês" valor={`${formatarNumero(qtd)} un.`} />
          <Caixa rotulo="Comissão acumulada" valor={formatarBRL(comissao)} destaque />
          {ehMesAtual ? (
            <Caixa rotulo="Se mantiver o ritmo, fecha o mês com" valor={formatarBRL(comissaoProjetada)} />
          ) : (
            <Caixa rotulo="Dias com venda" valor={`${extrato.dias.length} dias`} />
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <Medal className="size-4 text-gold" /> Faixa de conquista
          </div>
          <p className="mt-4 font-display text-2xl font-extrabold">
            {faixa ? (
              <>
                Faixa <span className="text-fire">{faixa.nome}</span>
              </>
            ) : (
              "Rumo à primeira faixa"
            )}
          </p>
          {prox ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                Faltam <b className="text-foreground">{formatarNumero(prox.faltam)} un.</b> para a faixa{" "}
                <b className="text-sun">{prox.faixa.nome}</b>
                {ehMesAtual && ritmo.diasRestantes > 0 && (
                  <> · cerca de {formatarNumero(Math.ceil(prox.faltam / ritmo.diasRestantes))} un. por dia</>
                )}
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                <div className="bg-fire h-full rounded-full" style={{ width: `${prox.progresso}%` }} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Você chegou à faixa máxima. Parabéns!</p>
          )}
          <ol className="mt-5 grid grid-cols-4 gap-2 text-center">
            {FAIXAS.map((f) => (
              <li
                key={f.id}
                className={cn(
                  "rounded-xl border px-2 py-2",
                  qtd >= f.minimo ? "border-sun/60 bg-sun/10" : "border-border opacity-60",
                )}
              >
                <p className="text-xs font-bold">{f.nome}</p>
                <p className="text-[11px] text-muted-foreground">{formatarNumero(f.minimo)} un.</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[11px] text-muted-foreground">
            As faixas são de reconhecimento: a comissão por unidade é a mesma em todas.
          </p>
        </section>

        <section className="surface p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <Calculator className="size-4 text-sun" /> Simulador de comissão
          </div>
          <label htmlFor="extra" className="mt-4 block text-sm text-muted-foreground">
            Se eu vender mais
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="extra"
              inputMode="numeric"
              value={String(extra)}
              onChange={(e) => setExtra(Math.min(Number(e.target.value.replace(/\D/g, "") || 0), 99999))}
              className="h-11 w-28 rounded-xl border border-border bg-card/70 px-3 text-center font-display text-xl font-bold outline-none focus:border-sun"
            />
            <span className="text-sm text-muted-foreground">unidades este mês</span>
          </div>
          <Slider
            className="mt-4"
            min={0}
            max={2000}
            step={10}
            value={[Math.min(extra, 2000)]}
            onValueChange={(v) => setExtra(v[0] ?? 0)}
            aria-label="Unidades a mais"
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Caixa rotulo="Comissão total" valor={formatarBRL(comissaoSimulada)} destaque />
            <Caixa rotulo="Ganho a mais" valor={`+ ${formatarBRL(comissaoSimulada - comissao)}`} />
            <Caixa rotulo="Faixa" valor={faixaSimulada?.nome ?? "—"} />
            <Caixa rotulo="Posição estimada" valor={`${posicaoSimulada}º`} />
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="surface p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <CalendarDays className="size-4 text-ember" /> Vendas por dia
          </div>
          <ul className="mt-5 space-y-3">
            {extrato.dias.map((d) => (
              <li key={d.data}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="capitalize text-muted-foreground">
                    {diaDaSemana(d.data).slice(0, 3)} · {dataBR(d.data)}
                  </span>
                  <span>
                    <b className="font-display">{formatarNumero(d.quantidade)}</b>{" "}
                    <span className="text-xs text-muted-foreground">un. · </span>
                    <b className="text-sun">{formatarBRL(comissaoVendedor(d.quantidade, d.campanha))}</b>
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-ember/70" style={{ width: `${(d.quantidade / maiorDia) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <Package className="size-4 text-sun" /> Por produto
          </div>
          {extrato.produtos.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">A venda por produto aparece após a próxima sincronização.</p>
          ) : (
            <ul className="mt-5 divide-y divide-border">
              {extrato.produtos.map((p) => (
                <li key={p.id_produto} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0 truncate">{p.produto}</span>
                  <b className="shrink-0 font-display">{formatarNumero(p.quantidade)}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Cartão motivador no topo do extrato: posição, variação, quem está à frente e atrás. */
function ProgressoPessoal({
  vendedor,
  painel,
  qtd,
  comissao,
  posicao,
  anterior,
}: {
  vendedor: string;
  painel: Painel;
  qtd: number;
  comissao: number;
  posicao: number | null;
  anterior: number | undefined;
}) {
  if (!posicao) return null;
  const aFrente = posicao > 1 ? painel.vendedores[posicao - 2] : null;
  const atras = painel.vendedores[posicao] ?? null;
  const faltam = aFrente ? aFrente.quantidade - qtd + 1 : 0;
  const progresso = aFrente ? Math.min((qtd / (aFrente.quantidade + 1)) * 100, 100) : 100;

  return (
    <section className="surface ring-fire relative overflow-hidden p-6 md:p-8 animate-rise">
      <div className="bg-fire pointer-events-none absolute -left-16 -top-16 size-48 rounded-full opacity-25 blur-3xl" />
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Rocket className="size-4 text-sun" /> Seu progresso
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-4">
        <p className="font-display text-4xl font-black">
          <span className="text-fire">{posicao}º</span>
        </p>
        <Variacao atual={posicao} anterior={anterior} />
        <p className="text-sm text-muted-foreground">
          no ranking geral · comissão atual <b className="text-sun">{formatarBRL(comissao)}</b>
        </p>
      </div>

      {posicao === 1 ? (
        <p className="relative mt-4 rounded-xl bg-sun/10 px-4 py-3 text-sm font-semibold">
          👑 Você lidera!
          {atras ? (
            <>
              {" "}Vantagem de <b className="text-sun">{formatarNumero(qtd - atras.quantidade)} un.</b> sobre{" "}
              {atras.vendedor}.
            </>
          ) : null}
        </p>
      ) : aFrente ? (
        <div className="relative mt-4">
          <p className="text-sm">
            Faltam <b className="text-fire">{formatarNumero(faltam)} un.</b> pra passar{" "}
            <b>{aFrente.vendedor}</b>
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-fire h-full rounded-full transition-[width] duration-1000"
              style={{ width: `${progresso}%` }}
            />
          </div>
          {atras && (
            <p className="mt-2 text-xs text-muted-foreground">
              Vantagem de {formatarNumero(qtd - atras.quantidade)} un. sobre {atras.vendedor}, que vem logo atrás.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function Caixa({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className={cn("font-display text-xl font-bold", destaque && "text-sun")}>{valor}</p>
    </div>
  );
}
