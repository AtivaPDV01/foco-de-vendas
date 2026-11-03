// Faixas e selos de conquista (gamificação). Regras puras, cobertas por src/test/conquistas.test.ts.
// As faixas são só de reconhecimento: a comissão por unidade não muda de uma faixa para outra.

export type Faixa = { id: "bronze" | "prata" | "ouro" | "diamante"; nome: string; minimo: number };

/** Faixas pelo total de unidades vendidas no mês. */
export const FAIXAS: Faixa[] = [
  { id: "bronze", nome: "Bronze", minimo: 300 },
  { id: "prata", nome: "Prata", minimo: 600 },
  { id: "ouro", nome: "Ouro", minimo: 1000 },
  { id: "diamante", nome: "Diamante", minimo: 2000 },
];

/** Faixa atingida com `unidades` no mês (null abaixo da primeira). */
export function faixaDe(unidades: number): Faixa | null {
  let atual: Faixa | null = null;
  for (const f of FAIXAS) if (unidades >= f.minimo) atual = f;
  return atual;
}

/** Próxima faixa e quantas unidades faltam para ela (null quando já está na última). */
export function proximaFaixa(unidades: number): { faixa: Faixa; faltam: number; progresso: number } | null {
  const proxima = FAIXAS.find((f) => unidades < f.minimo);
  if (!proxima) return null;
  const anterior = faixaDe(unidades)?.minimo ?? 0;
  const progresso = ((unidades - anterior) / (proxima.minimo - anterior)) * 100;
  return { faixa: proxima, faltam: proxima.minimo - unidades, progresso: Math.max(0, Math.min(progresso, 100)) };
}

export type Selo = { id: "faixa" | "destaque" | "lider-loja" | "constante"; rotulo: string; faixa?: Faixa["id"] };

/** Vende em pelo menos esta fração dos dias com venda do mês (e no mínimo 3 dias) para ganhar o selo. */
export const CONSTANCIA_MINIMA = 0.8;

export type VendedorParaSelos = { vendedor: string; loja: string; quantidade: number; dias?: number };

/**
 * Selos de cada vendedor do ranking (lista ordenada do maior para o menor):
 * faixa do mês, destaque do dia, nº 1 da própria loja e constância.
 */
export function selosDoRanking(
  vendedores: VendedorParaSelos[],
  opcoes: { destaqueDoDia?: string | null | undefined; diasComVenda?: number | undefined } = {},
): Map<string, Selo[]> {
  const lideres = new Set<string>();
  const lojasVistas = new Set<string>();
  for (const v of vendedores) {
    if (v.quantidade > 0 && !lojasVistas.has(v.loja)) {
      lojasVistas.add(v.loja);
      lideres.add(v.vendedor);
    }
  }
  const diasMes = opcoes.diasComVenda ?? 0;
  const resultado = new Map<string, Selo[]>();
  for (const v of vendedores) {
    const selos: Selo[] = [];
    const f = faixaDe(v.quantidade);
    if (f) selos.push({ id: "faixa", rotulo: f.nome, faixa: f.id });
    if (opcoes.destaqueDoDia && v.vendedor === opcoes.destaqueDoDia) selos.push({ id: "destaque", rotulo: "Destaque do dia" });
    if (lideres.has(v.vendedor)) selos.push({ id: "lider-loja", rotulo: "Nº 1 da loja" });
    if (diasMes >= 3 && (v.dias ?? 0) >= Math.ceil(diasMes * CONSTANCIA_MINIMA)) {
      selos.push({ id: "constante", rotulo: "Constante" });
    }
    resultado.set(v.vendedor, selos);
  }
  return resultado;
}

/** Posição que o vendedor teria com `unidades` no ranking (1 = primeiro). */
export function posicaoCom(unidades: number, vendedor: string, ranking: { vendedor: string; quantidade: number }[]) {
  return ranking.filter((r) => r.vendedor !== vendedor && r.quantidade > unidades).length + 1;
}
