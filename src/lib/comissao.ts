/** Comissão do vendedor por unidade vendida, em reais. */
export const COMISSAO_VENDEDOR_POR_UNIDADE = 0.2;
/** Comissão da loja por unidade vendida na loja, em reais. */
export const COMISSAO_LOJA_POR_UNIDADE = 0.05;
/** Comissão do vendedor por unidade do item de campanha (comissão reduzida), em reais. */
export const COMISSAO_VENDEDOR_CAMPANHA = 0.1;
/** Comissão da loja por unidade do item de campanha (metade da normal), em reais. */
export const COMISSAO_LOJA_CAMPANHA = 0.025;

// Calcula em milésimos de real inteiros para evitar erros de ponto flutuante
// (a loja ganha R$ 0,025 na campanha, que não cabe em centavos).
const mil = (reais: number) => Math.round(reais * 1000);

function comissao(unidades: number, campanha: number, normal: number, reduzida: number) {
  const total = Math.max(Math.round(unidades), 0);
  const camp = Math.min(Math.max(Math.round(campanha), 0), total);
  return ((total - camp) * mil(normal) + camp * mil(reduzida)) / 1000;
}

/**
 * @param unidades total de unidades vendidas
 * @param campanha quantas dessas unidades são do item de campanha
 */
export function comissaoVendedor(unidades: number, campanha = 0) {
  return comissao(unidades, campanha, COMISSAO_VENDEDOR_POR_UNIDADE, COMISSAO_VENDEDOR_CAMPANHA);
}

export function comissaoLoja(unidades: number, campanha = 0) {
  return comissao(unidades, campanha, COMISSAO_LOJA_POR_UNIDADE, COMISSAO_LOJA_CAMPANHA);
}

/**
 * Meses (AAAA-MM) em que a campanha teve item com comissão reduzida.
 * Out/2026: Mendorato pagava R$ 0,10. Nov/2026 em diante: todos os itens pagam o valor normal.
 */
const MESES_COM_ITEM_REDUZIDO = ["2026-10"];

export function mesTemItemReduzido(mes: string) {
  return MESES_COM_ITEM_REDUZIDO.includes(mes.slice(0, 7));
}

const reais = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

/** Texto da regra de comissão do vendedor exibido no ranking daquele mês. */
export function regraComissaoVendedor(mes: string) {
  const base = `${reais(COMISSAO_VENDEDOR_POR_UNIDADE)} por unidade`;
  return mesTemItemReduzido(mes) ? `${base} · ${reais(COMISSAO_VENDEDOR_CAMPANHA)} na campanha` : base;
}

/** Texto da regra de comissão da loja exibido no ranking daquele mês. */
export function regraComissaoLoja(mes: string) {
  const base = `${reais(COMISSAO_LOJA_POR_UNIDADE)} por unidade`;
  return mesTemItemReduzido(mes) ? `${base} · ${reais(COMISSAO_LOJA_CAMPANHA)} na campanha` : base;
}

/** Percentual da meta atingido (0–100+, sem teto). */
export function progressoMeta(total: number, meta: number | null | undefined) {
  if (!meta || meta <= 0) return 0;
  return (total / meta) * 100;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = new Intl.NumberFormat("pt-BR");

export const formatarBRL = (valor: number) => brl.format(valor);
export const formatarNumero = (valor: number) => inteiro.format(valor);
