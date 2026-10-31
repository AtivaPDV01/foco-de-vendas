import { Crown, Flame, Store, Target, Trophy, Users } from "lucide-react";
import {
  comissaoLoja,
  comissaoVendedor,
  formatarBRL,
  formatarNumero,
  progressoMeta,
} from "@/lib/comissao";
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

export function MetaCard({ painel }: { painel: Painel }) {
  const mes = painel.mes.slice(0, 7);
  const pct = progressoMeta(painel.total, painel.meta);
  const restante = painel.meta ? Math.max(painel.meta - painel.total, 0) : 0;
  const ehMesAtual = mes === mesAtualSP();
  const diasRestantes = ehMesAtual ? diasNoMes(mes) - Number(hojeSP().slice(8, 10)) + 1 : 0;
  const porDia = diasRestantes > 0 ? Math.ceil(restante / diasRestantes) : 0;
  const batida = painel.meta !== null && painel.total >= painel.meta;

  return (
    <section className="surface glow relative overflow-hidden p-6 md:p-8 animate-rise">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Target className="size-4 text-sun" /> Meta geral do mês
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
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {batida ? "Meta batida! Excedente" : "Faltam"}
              </p>
              <p className="font-display text-xl font-bold">
                {formatarNumero(batida ? painel.total - painel.meta! : restante)} un.
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {ehMesAtual && !batida ? "Ritmo necessário" : "Dias restantes"}
              </p>
              <p className="font-display text-xl font-bold">
                {ehMesAtual && !batida
                  ? `${formatarNumero(porDia)} un./dia`
                  : `${ehMesAtual ? diasRestantes : 0} dias`}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          A meta deste mês ainda não foi definida.
        </p>
      )}
    </section>
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

export function Podio({ vendedores }: { vendedores: VendedorRanking[] }) {
  const top = vendedores.slice(0, 3);
  // Ordem visual: 2º, 1º, 3º
  const ordem = [1, 0, 2].filter((i) => top[i]);
  const alturas = ["h-44 md:h-56", "h-32 md:h-40", "h-24 md:h-28"];

  return (
    <section className="surface p-6 md:p-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Trophy className="size-4 text-gold" /> Pódio geral
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

export function RankingVendedores({
  vendedores,
  titulo = "Ranking geral de vendedores",
  vazio = "Sem vendas neste mês.",
}: {
  vendedores: VendedorRanking[];
  titulo?: string;
  vazio?: string;
}) {
  return (
    <section className="surface p-6 md:p-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Users className="size-4 text-ember" /> {titulo}
        </div>
        <span className="text-xs text-muted-foreground">R$ 0,20 por unidade · R$ 0,10 na campanha</span>
      </div>
      {vendedores.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ol className="mt-5 divide-y divide-border">
          <li className="hidden grid-cols-[2.5rem_1fr_6rem_7rem] gap-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
            <span>#</span>
            <span>Vendedor</span>
            <span className="text-right">Unidades</span>
            <span className="text-right">Comissão</span>
          </li>
          {vendedores.map((v, i) => (
            <li
              key={v.vendedor}
              className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 py-3 sm:grid-cols-[2.5rem_1fr_6rem_7rem]"
            >
              <span
                className={cn(
                  "font-display text-lg font-extrabold",
                  corPosicao(i),
                )}
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                  {iniciais(v.vendedor)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{v.vendedor}</p>
                  <p className="truncate text-xs text-muted-foreground">{v.loja}</p>
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
          ))}
        </ol>
      )}
    </section>
  );
}

export function RankingLojas({
  lojas,
  titulo = "Ranking das lojas",
  vazio = "Sem vendas neste mês.",
}: {
  lojas: LojaRanking[];
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
        <span className="text-xs text-muted-foreground">R$ 0,05 por unidade · R$ 0,025 na campanha</span>
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
