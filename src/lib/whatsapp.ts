// Montagem da mensagem diária de WhatsApp para os gerentes (pura, testável).

export type ResumoLoja = {
  /** Primeiro nome do gerente. */
  nome: string;
  loja: string;
  unidadesOntem: number;
  comissaoOntem: number;
  /** Posição atual da loja no ranking do mês (null se a loja não vendeu no mês). */
  posicao: number | null;
  /** Quantas posições subiu em relação a ontem (negativo = caiu, 0 = manteve). */
  variacao: number | null;
  /** A loja não estava no ranking de ontem. */
  novo: boolean;
  destaque: { vendedor: string; quantidade: number } | null;
  meta: number | null;
  totalMes: number;
  lojaAFrente: { loja: string; faltam: number } | null;
};

const FECHAMENTOS = [
  "Bora pra cima, {nome}! 💪",
  "Hoje é dia de brilhar, {nome}! 🔥",
  "Vamos com tudo, {nome}! 🚀",
  "Conto com você, {nome}! ⭐",
];

/** Texto da variação de posição: "▲2", "▼1", "=" ou "NOVO". */
export function textoVariacao(variacao: number | null, novo: boolean) {
  if (novo || variacao === null) return "NOVO";
  if (variacao > 0) return `▲${variacao}`;
  if (variacao < 0) return `▼${-variacao}`;
  return "=";
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const inteiro = new Intl.NumberFormat("pt-BR");

/** Monta a mensagem diária. O fechamento varia conforme o dia do mês. */
export function mensagemResumoLoja(r: ResumoLoja, diaDoMes: number) {
  const linhas: string[] = [
    `Bom dia, ${r.nome}! ☀️ Aqui vai o resumo de ontem da ${r.loja}:`,
    "",
    `🛒 Vendas de ontem: ${inteiro.format(r.unidadesOntem)} un. (comissão da loja: ${brl.format(r.comissaoOntem)})`,
  ];
  if (r.posicao !== null) {
    linhas.push(`🏆 Posição no ranking do mês: ${r.posicao}º ${textoVariacao(r.variacao, r.novo)}`);
  }
  if (r.destaque) {
    linhas.push(`⭐ Destaque do dia: ${r.destaque.vendedor} (${inteiro.format(r.destaque.quantidade)} un.)`);
  }
  if (r.meta && r.meta > 0) {
    const pct = Math.min(Math.round((r.totalMes / r.meta) * 100), 999);
    linhas.push(`🎯 Meta do mês: ${pct}% (${inteiro.format(r.totalMes)} de ${inteiro.format(r.meta)} un.)`);
  }
  if (r.lojaAFrente) {
    linhas.push(`🚀 Faltam ${inteiro.format(r.lojaAFrente.faltam)} un. pra passar a ${r.lojaAFrente.loja}!`);
  } else if (r.posicao === 1) {
    linhas.push("👑 Sua loja está na liderança!");
  }
  const fechamento = FECHAMENTOS[diaDoMes % FECHAMENTOS.length]!.replace("{nome}", r.nome);
  linhas.push("", fechamento);
  return linhas.join("\n");
}

/** Deixa só dígitos e adiciona o DDI 55 quando vier só DDD + número. */
export function normalizarTelefone(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos;
}
