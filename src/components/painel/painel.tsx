import type React from "react";
import { useState } from "react";
import { CalendarCheck, Crown, Flame, Gem, Medal, Search, Store, Target, Thermometer, Trophy, Users } from "lucide-react";
import {
  comissaoLoja,
  comissaoVendedor,
  formatarBRL,
  formatarNumero,
  progressoMeta,
  regraComissaoLoja,
  regraComissaoVendedor,
  ritmoMeta,
  type Ritmo,
} from "@/lib/comissao";
import type { Selo } from "@/lib/conquistas";
import { dataBR, diaDaSemana, diasNoMes, hojeSP, mesAtualSP, somarDias } from "@/lib/datas";
import type { Destaque, LojaDestaque, LojaRanking, Painel, VendedorRanking } from "@/lib/painel.functions";
import { cn } from "@/lib/utils";

export function iniciais(nome: string) {
  const partes = nome.split(" ").filter((p) => p.length > 2 || /^[A-Z]/.test(p));
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

const MEDALHA = [
  { anel: "border-gold text-gold", fundo: "bg-gold", label: "1º" },
  { anel: "border-silver text-silver", fundo: "bg-silver", label: "2º" },
  { anel: "border-bronze text-bronze", fundo: "bg-bronze", label: "3º" },
];

function corPosicao(i: number) {
  return ["text-gold", "text-silver", "text-bronze"][i] ?? "text-muted-foreground";
}

const SITUACAO: Record<Ritmo["situacao"], { rotulo: string; classe: string }> = {
  acima: { rotulo: "Acima do ritmo", classe: "bg-success/15 text-success" },
  "no-ritmo": { rotulo: "No ritmo", classe: "bg-sun/15 text-sun" },
  abaixo: { rotulo: "Abaixo do ritmo", classe: "bg-flame/15 text-flame" },
  batida: { rotulo: "Meta batida", classe: "bg-success/15 text-success" },
  "sem-meta": { rotulo: "", classe: "" },
};

export function MetaCard({ painel, titulo = "Meta geral do mês" }: { painel: Painel; titulo?: string }) {
  const mes = painel.mes.slice(0, 7);
  const pct = progressoMeta(painel.total, painel.meta);
  const restante = painel.meta ? Math.max(painel.meta - painel.total, 0) : 0;
  const atual = mesAtualSP();
  const ehMesAtual = mes === atual;
  const fechado = mes < atual;
  const totalDias = diasNoMes(mes);
  const ritmo = ritmoMeta(painel.total, painel.meta, ehMesAtual ? Number(hojeSP().slice(8, 10)) : totalDias, totalDias);
  const batida = painel.meta !== null && painel.total >= painel.meta;
  // Termômetro: ritmo atual em relação ao necessário (100% = no ritmo exato).
  const temperatura =
    batida ? 100 : ritmo.ritmoNecessario > 0 ? Math.min((ritmo.ritmoAtual / ritmo.ritmoNecessario) * 100, 100) : 0;
  const situacao = SITUACAO[ritmo.situacao];

  return (
    <section className="surface glow relative overflow-hidden p-6 md:p-8 animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Target className="size-4 text-sun" /> {titulo}
        </div>
        {painel.meta && ehMesAtual ? (
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", situacao.classe)}>{situacao.rotulo}</span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-5xl font-extrabold leading-none md:text-7xl">
            <span className="text-fire">{formatarNumero(painel.total)}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            unidades vendidas
            {painel.meta ? (
              <>
                {" "}
                de <span className="font-bold text-foreground">{formatarNumero(painel.meta)}</span>
              </>
            ) : null}
          </p>
        </div>
        {painel.meta ? (
          <p className="font-display text-4xl font-bold text-sun md:text-5xl">
            {pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
          </p>
        ) : null}
      </div>

      {painel.meta ? (
        <>
          <div className="relative mt-6 h-5 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-fire animate-shine h-full rounded-full transition-[width] duration-1000"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
            {ehMesAtual && !batida && ritmo.projecaoPct > 0 && (
              <span
                className="absolute top-0 h-full w-1 rounded-full bg-foreground/80"
                style={{ left: `calc(${Math.min(ritmo.projecaoPct, 100)}% - 2px)` }}
                title="Projeção de fechamento"
              />
            )}
            {[25, 50, 75].map((m) => (
              <span
                key={m}
                className="absolute top-0 h-full w-px bg-background/60"
                style={{ left: `${m}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted-foreground">
            <span>0</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>

          {ehMesAtual ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Caixa
                  rotulo={batida ? "Meta batida! Excedente" : "Faltam"}
                  valor={`${formatarNumero(batida ? painel.total - painel.meta : restante)} un.`}
                />
                <Caixa rotulo="Ritmo atual" valor={`${formatarNumero(Math.round(ritmo.ritmoAtual))} un./dia`} />
                <Caixa
                  rotulo={batida ? "Dias restantes" : "Ritmo necessário"}
                  valor={batida ? `${ritmo.diasRestantes} dias` : `${formatarNumero(ritmo.ritmoNecessario)} un./dia`}
                />
              </div>

              <div className="mt-5 grid items-center gap-5 rounded-2xl bg-muted/40 p-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Thermometer className="size-4 text-ember" /> Termômetro de ritmo
                  </div>
                  <div className="relative mt-3 h-3 rounded-full bg-[linear-gradient(90deg,var(--color-flame),var(--color-ember),var(--color-sun),var(--color-success))]">
                    <span
                      className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-background bg-foreground shadow transition-[left] duration-1000"
                      style={{ left: `${temperatura}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>Frio</span>
                    <span>No ritmo da meta</span>
                  </div>
                </div>
                <div className="sm:border-l sm:border-border sm:pl-5 sm:text-right">
                  <p className="text-xs text-muted-foreground">Projeção de fechamento</p>
                  <p className="font-display text-2xl font-extrabold">
                    {formatarNumero(ritmo.projecao)} <span className="text-sm font-semibold text-muted-foreground">un.</span>
                  </p>
                  <p className="text-xs font-bold text-sun">
                    {ritmo.projecaoPct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% da meta
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-xl bg-muted/60 px-4 py-3 text-sm">
              {fechado
                ? batida
                  ? `Meta batida! Fechou com ${formatarNumero(painel.total - painel.meta)} un. acima.`
                  : `Fechou faltando ${formatarNumero(restante)} un. para a meta.`
                : "Este mês ainda não começou."}
            </p>
          )}
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          A meta deste mês ainda não foi definida.
        </p>
      )}
    </section>
  );
}

function Caixa({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-muted/60 px-4 py-3">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="font-display text-xl font-bold">{valor}</p>
    </div>
  );
}

const ESTILO_SELO: Record<string, string> = {
  bronze: "border-bronze/50 bg-bronze/15 text-bronze",
  prata: "border-silver/50 bg-silver/15 text-silver",
  ouro: "border-gold/50 bg-gold/15 text-gold",
  diamante: "border-diamond/50 bg-diamond/15 text-diamond",
  destaque: "border-flame/50 bg-flame/15 text-flame",
  "lider-loja": "border-ember/50 bg-ember/15 text-ember",
  constante: "border-success/50 bg-success/15 text-success",
};

function IconeSelo({ selo }: { selo: Selo }) {
  const c = "size-3";
  if (selo.id === "faixa") return selo.faixa === "diamante" ? <Gem className={c} /> : <Medal className={c} />;
  if (selo.id === "destaque") return <Flame className={c} />;
  if (selo.id === "lider-loja") return <Crown className={c} />;
  return <CalendarCheck className={c} />;
}

export function Selos({ selos, className }: { selos: Selo[] | undefined; className?: string }) {
  if (!selos?.length) return null;
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {selos.map((s) => (
        <span
          key={s.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none",
            ESTILO_SELO[s.faixa ?? s.id],
          )}
        >
          <IconeSelo selo={s} />
          {s.rotulo}
        </span>
      ))}
    </span>
  );
}

function rotuloDia(iso: string) {
  const hoje = hojeSP();
  const ontem = somarDias(hoje, -1);
  if (iso === ontem) return `Ontem · ${dataBR(iso)}`;
  if (iso === hoje) return `Hoje · ${dataBR(iso)}`;
  return `${diaDaSemana(iso)} · ${dataBR(iso)}`;
}

export function DestaqueCard({ destaque }: { destaque: Destaque | null }) {
  return (
    <section className="surface ring-fire relative overflow-hidden p-6 md:p-8 animate-rise [animation-delay:120ms]">
      <div className="bg-fire pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-25 blur-3xl" />
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Flame className="size-4 text-flame" /> Destaque do dia
      </div>
      {destaque ? (
        <div className="relative mt-5">
          <p className="text-sm capitalize text-muted-foreground">{rotuloDia(destaque.data)}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="bg-fire glow-sun flex size-16 shrink-0 items-center justify-center rounded-full font-display text-xl font-extrabold text-accent-foreground">
              {iniciais(destaque.vendedor)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-bold md:text-3xl">{destaque.vendedor}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Store className="size-3.5" /> {destaque.loja}
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Vendeu</p>
              <p className="text-fire font-display text-2xl font-extrabold">
                {formatarNumero(destaque.quantidade)} un.
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Comissão do dia</p>
              <p className="font-display text-2xl font-extrabold text-sun">
                {formatarBRL(comissaoVendedor(destaque.quantidade, destaque.campanha))}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Nenhuma venda lançada ainda.</p>
      )}
    </section>
  );
}

export function LojaDestaqueCard({ loja }: { loja: LojaDestaque | null }) {
  return (
    <section className="surface ring-fire relative overflow-hidden p-6 md:p-8 animate-rise [animation-delay:240ms]">
      <div className="bg-fire pointer-events-none absolute -left-16 -bottom-16 size-48 rounded-full opacity-25 blur-3xl" />
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Store className="size-4 text-sun" /> Loja destaque do dia
      </div>
      {loja ? (
        <div className="relative mt-5">
          <p className="text-sm capitalize text-muted-foreground">{rotuloDia(loja.data)}</p>
          <div className="mt-4 flex items-center gap-4">
            <div className="bg-fire glow-sun flex size-16 shrink-0 items-center justify-center rounded-2xl text-accent-foreground">
              <Store className="size-7" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-bold md:text-3xl">{loja.loja}</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="size-3.5" /> {loja.vendedores} {loja.vendedores === 1 ? "vendedor" : "vendedores"} no dia
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Vendeu</p>
              <p className="text-fire font-display text-2xl font-extrabold">
                {formatarNumero(loja.quantidade)} un.
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">Comissão da loja</p>
              <p className="font-display text-2xl font-extrabold text-sun">
                {formatarBRL(comissaoLoja(loja.quantidade, loja.campanha))}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">Nenhuma venda lançada ainda.</p>
      )}
    </section>
  );
}

export function Podio({
  vendedores,
  titulo = "Pódio geral",
  acao,
}: {
  vendedores: VendedorRanking[];
  titulo?: string;
  acao?: React.ReactNode;
}) {
  const top = vendedores.slice(0, 3);
  // Ordem visual: 2º, 1º, 3º
  const ordem = [1, 0, 2].filter((i) => top[i]);
  const alturas = ["h-44 md:h-56", "h-32 md:h-40", "h-24 md:h-28"];

  return (
    <section className="surface p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Trophy className="size-4 text-gold" /> {titulo}
        </div>
        {acao}
      </div>
      {top.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">O pódio aparece assim que houver vendas no mês.</p>
      ) : (
        <div className="mt-8 grid grid-cols-3 items-end gap-3 md:gap-6">
          {ordem.map((i) => {
            const v = top[i]!;
            const med = MEDALHA[i]!;
            return (
              <div
                key={v.vendedor}
                className="flex flex-col items-center text-center animate-rise"
                style={{ animationDelay: `${(2 - i) * 120}ms` }}
              >
                {i === 0 && <Crown className="mb-1 size-7 text-gold drop-shadow" />}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full border-4 bg-card font-display font-extrabold",
                    med.anel,
                    i === 0 ? "size-20 text-2xl md:size-24 md:text-3xl glow-sun" : "size-16 text-xl md:size-20",
                  )}
                >
                  {iniciais(v.vendedor)}
                </div>
                <p className="mt-3 line-clamp-2 font-display text-sm font-bold leading-tight md:text-lg">
                  {v.vendedor}
                </p>
                <p className="text-xs text-muted-foreground">{v.loja}</p>
                <p className="mt-2 font-display text-lg font-extrabold md:text-2xl">
                  {formatarNumero(v.quantidade)} <span className="text-xs font-semibold text-muted-foreground">un.</span>
                </p>
                <p className="text-sm font-bold text-sun">{formatarBRL(comissaoVendedor(v.quantidade, v.campanha))}</p>
                <div
                  className={cn(
                    "mt-4 flex w-full items-start justify-center rounded-t-2xl pt-3",
                    i === 0 ? "bg-fire-vertical" : "bg-secondary",
                    alturas[i],
                  )}
                >
                  <span
                    className={cn(
                      "font-display text-3xl font-black md:text-5xl",
                      i === 0 ? "text-accent-foreground" : corPosicao(i),
                    )}
                  >
                    {med.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Selo de variação de posição em relação a ontem: ▲ subiu, ▼ caiu, = manteve, NOVO se não estava no ranking. */
export function Variacao({ atual, anterior }: { atual: number; anterior: number | undefined }) {
  const base = "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none";
  if (anterior === undefined) {
    return <span className={cn(base, "bg-sun/15 text-sun")}>NOVO</span>;
  }
  const d = anterior - atual;
  if (d > 0) return <span className={cn(base, "bg-success/15 text-success")}>▲{d}</span>;
  if (d < 0) return <span className={cn(base, "bg-flame/15 text-flame")}>▼{-d}</span>;
  return <span className={cn(base, "bg-muted text-muted-foreground")}>=</span>;
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const PAGINA = 10;

export function RankingVendedores({
  vendedores,
  mes,
  titulo = "Ranking geral de vendedores",
  vazio = "Sem vendas neste mês.",
  selos,
  variacoes,
}: {
  vendedores: VendedorRanking[];
  /** Selos de conquista por vendedor. */
  selos?: Map<string, Selo[]>;
  /** Mês (AAAA-MM) exibido, para mostrar a regra de comissão daquele mês. */
  mes: string;
  titulo?: string;
  vazio?: string;
  /** Posição de cada vendedor no ranking de ontem (só no mês atual). */
  variacoes?: Record<string, number>;
}) {
  const [busca, setBusca] = useState("");
  const [visivel, setVisivel] = useState(PAGINA);
  const termo = normalizar(busca.trim());
  const posicaoDe = new Map(vendedores.map((v, i) => [v.vendedor, i + 1]));
  const filtrados = termo
    ? vendedores.filter((v) => normalizar(v.vendedor).includes(termo) || normalizar(v.loja).includes(termo))
    : null;
  const exibidos = filtrados ?? vendedores.slice(0, visivel);
  const tudoVisivel = visivel >= vendedores.length;

  return (
    <section className="surface p-6 md:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Users className="size-4 text-ember" /> {titulo}
        </div>
        <span className="text-xs text-muted-foreground">{regraComissaoVendedor(mes)}</span>
      </div>
      {vendedores.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <>
          <label className="relative mt-4 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Buscar seu nome"
              placeholder="Buscar seu nome"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-11 w-full rounded-full border border-border bg-card/70 pl-9 pr-4 text-sm outline-none focus:border-sun"
            />
          </label>
          {filtrados && filtrados.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Nenhum vendedor encontrado.</p>
          ) : (
            <ol className="mt-4 divide-y divide-border">
              <li className="hidden grid-cols-[2.5rem_1fr_6rem_7rem] gap-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
                <span>#</span>
                <span>Vendedor</span>
                <span className="text-right">Unidades</span>
                <span className="text-right">Comissão</span>
              </li>
              {exibidos.map((v, i) => {
                const pos = posicaoDe.get(v.vendedor) ?? i + 1;
                return (
                  <li
                    key={v.vendedor}
                    className={cn(
                      "grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-3 sm:grid-cols-[2.5rem_1fr_6rem_7rem]",
                      !filtrados && i >= PAGINA && "animate-rise",
                    )}
                  >
                    <span className={cn("flex items-center gap-1.5 font-display text-lg font-extrabold", corPosicao(pos - 1))}>
                      {pos}º
                      {variacoes && <Variacao atual={pos} anterior={variacoes[v.vendedor]} />}
                    </span>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                        {iniciais(v.vendedor)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{v.vendedor}</p>
                        <p className="truncate text-xs text-muted-foreground">{v.loja}</p>
                        <Selos selos={selos?.get(v.vendedor)} className="mt-1" />
                      </div>
                    </div>
                    <div className="text-right sm:contents">
                      <p className="font-display font-bold sm:text-right">
                        {formatarNumero(v.quantidade)}
                        <span className="text-xs font-medium text-muted-foreground sm:hidden"> un.</span>
                      </p>
                      <p className="text-sm font-bold text-sun sm:text-right">
                        {formatarBRL(comissaoVendedor(v.quantidade, v.campanha))}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {!filtrados && vendedores.length > PAGINA && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setVisivel(tudoVisivel ? PAGINA : Math.min(visivel + PAGINA, vendedores.length))}
                className="rounded-full border border-border px-5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-sun hover:text-foreground"
              >
                {tudoVisivel ? "Mostrar menos" : "Ver mais"}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                Exibindo {Math.min(visivel, vendedores.length)} de {vendedores.length}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function RankingLojas({
  lojas,
  mes,
  titulo = "Ranking das lojas",
  vazio = "Sem vendas neste mês.",
}: {
  lojas: LojaRanking[];
  /** Mês (AAAA-MM) exibido, para mostrar a regra de comissão daquele mês. */
  mes: string;
  titulo?: string;
  vazio?: string;
}) {
  const maior = lojas[0]?.quantidade || 1;
  return (
    <section className="surface p-6 md:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Store className="size-4 text-sun" /> {titulo}
        </div>
        <span className="text-xs text-muted-foreground">{regraComissaoLoja(mes)}</span>
      </div>
      {lojas.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ol className="mt-5 space-y-4">
          {lojas.map((l, i) => (
            <li key={l.loja}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate font-semibold">
                  <span
                    className={cn(
                      "mr-2 font-display font-extrabold",
                      corPosicao(i),
                    )}
                  >
                    {i + 1}
                  </span>
                  {l.loja}
                </p>
                <p className="shrink-0 font-display font-bold">
                  {formatarNumero(l.quantidade)} <span className="text-xs text-muted-foreground">un.</span>
                </p>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", i === 0 ? "bg-fire" : "bg-ember/70")}
                  style={{ width: `${(l.quantidade / maior) * 100}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span>
                  {l.vendedores} {l.vendedores === 1 ? "vendedor" : "vendedores"}
                </span>
                <span className="font-bold text-sun">Comissão {formatarBRL(comissaoLoja(l.quantidade, l.campanha))}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
