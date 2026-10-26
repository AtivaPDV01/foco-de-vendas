/** Comissão do vendedor por unidade vendida, em reais. */
export const COMISSAO_VENDEDOR_POR_UNIDADE = 0.2;
/** Comissão da loja por unidade vendida na loja, em reais. */
export const COMISSAO_LOJA_POR_UNIDADE = 0.05;

// Calcula em centavos inteiros para evitar erros de ponto flutuante.
function emReais(unidades: number, centavosPorUnidade: number) {
  return (Math.round(unidades) * centavosPorUnidade) / 100;
}

export function comissaoVendedor(unidades: number) {
  return emReais(unidades, Math.round(COMISSAO_VENDEDOR_POR_UNIDADE * 100));
}

export function comissaoLoja(unidades: number) {
  return emReais(unidades, Math.round(COMISSAO_LOJA_POR_UNIDADE * 100));
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
