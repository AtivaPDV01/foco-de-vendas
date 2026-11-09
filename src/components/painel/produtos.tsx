import { Package, Store, Target, User } from "lucide-react";
import { formatarNumero, progressoMeta } from "@/lib/comissao";
import type { Campanha, ProdutoDesempenho } from "@/lib/painel.functions";
import { cn } from "@/lib/utils";

type Linha = {
  chave: string;
  nome: string;
  imagem: string | null;
  meta: number | null;
  venda: ProdutoDesempenho | null;
};

/** Junta os produtos cadastrados na campanha com a venda por produto vinda do Mercaflow. */
export function juntarProdutos(campanha: Campanha | null, vendas: ProdutoDesempenho[]): Linha[] {
  const porId = new Map(vendas.map((v) => [v.id_produto, v]));
  const usados = new Set<number>();
  const linhas: Linha[] = (campanha?.itens ?? []).map((i) => {
    const venda = i.id_produto !== null ? (porId.get(i.id_produto) ?? null) : null;
    if (i.id_produto !== null) usados.add(i.id_produto);
    return { chave: i.id, nome: i.nome, imagem: i.imagem, meta: i.meta, venda };
  });
  for (const v of vendas) {
    if (!usados.has(v.id_produto)) {
      linhas.push({ chave: `mf-${v.id_produto}`, nome: v.produto, imagem: null, meta: null, venda: v });
    }
  }
  return linhas.sort((a, b) => (b.venda?.quantidade ?? 0) - (a.venda?.quantidade ?? 0));
}

export function DesempenhoProdutos({
  campanha,
  vendas,
  loja,
}: {
  campanha: Campanha | null;
  vendas: ProdutoDesempenho[];
  loja?: string | undefined;
}) {
  const linhas = juntarProdutos(campanha, vendas);
  if (!linhas.length) return null;
  const total = linhas.reduce((s, l) => s + (l.venda?.quantidade ?? 0), 0);
  const maior = Math.max(...linhas.map((l) => l.venda?.quantidade ?? 0), 1);

  return (
    <section className="surface p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Package className="size-4 text-sun" /> Desempenho por produto
        </div>
        <span className="text-xs text-muted-foreground">
          {loja ? `${loja} · ` : ""}
          {formatarNumero(total)} un. nos produtos da campanha
        </span>
      </div>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {linhas.map((l, i) => {
          const qtd = l.venda?.quantidade ?? 0;
          const fatia = total > 0 ? (qtd / total) * 100 : 0;
          const pctMeta = l.meta ? progressoMeta(qtd, l.meta) : null;
          return (
            <li key={l.chave} className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_50%_45%,var(--color-secondary),var(--color-card)_70%)] p-1.5">
                  {l.imagem ? (
                    <img src={l.imagem} alt={l.nome} loading="lazy" className="h-full w-full object-contain" />
                  ) : (
                    <Package className="size-6 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-bold leading-tight">{l.nome}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold">
                    <span className={cn(i === 0 && qtd > 0 && "text-fire")}>{formatarNumero(qtd)}</span>{" "}
                    <span className="text-xs font-semibold text-muted-foreground">
                      un. · {fatia.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
                    </span>
                  </p>
                </div>
              </div>
              {pctMeta !== null ? (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Target className="size-3" /> Meta {formatarNumero(l.meta!)} un.
                    </span>
                    <span className="text-sun">{pctMeta.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="bg-fire h-full rounded-full" style={{ width: `${Math.min(pctMeta, 100)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-ember/70" style={{ width: `${(qtd / maior) * 100}%` }} />
                </div>
              )}
              {l.venda?.top_vendedor ? (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <p className="flex items-center gap-1.5 truncate">
                    <User className="size-3 shrink-0 text-sun" /> Quem mais vende:{" "}
                    <span className="truncate font-semibold text-foreground">{l.venda.top_vendedor}</span> (
                    {formatarNumero(l.venda.top_vendedor_qtd ?? 0)})
                  </p>
                  {!loja && l.venda.top_loja && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Store className="size-3 shrink-0 text-sun" /> Loja líder:{" "}
                      <span className="truncate font-semibold text-foreground">{l.venda.top_loja}</span> (
                      {formatarNumero(l.venda.top_loja_qtd ?? 0)})
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Sem vendas ainda.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
