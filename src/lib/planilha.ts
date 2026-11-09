export type LinhaVenda = {
  data: string; // YYYY-MM-DD
  vendedor: string;
  loja: string;
  /** Total de unidades (normais + campanha). */
  quantidade: number;
  /** Quantas das unidades são do item de campanha (comissão reduzida). */
  quantidade_campanha: number;
};

export type ResultadoPlanilha = {
  vendas: LinhaVenda[];
  erros: string[];
};

type Campo = "data" | "vendedor" | "loja" | "quantidade" | "campanha";

const SINONIMOS: Record<Exclude<Campo, "campanha">, string[]> = {
  data: ["data", "dia", "data da venda", "data venda"],
  vendedor: ["vendedor", "vendedora", "nome", "colaborador", "consultor", "consultora", "funcionario"],
  loja: ["loja", "filial", "unidade", "pdv", "ponto de venda"],
  quantidade: ["quantidade", "qtd", "qtde", "quant", "unidades", "vendas", "itens", "total"],
};

function normalizar(texto: unknown) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function identificarCampo(cabecalho: unknown): Campo | null {
  const n = normalizar(cabecalho);
  if (!n) return null;
  const ehQuantidade = SINONIMOS.quantidade.some((s) => n === s || n.startsWith(s));
  // "Quantidade 0,10", "Qtd R$ 0,10", "Qtd campanha" -> unidades com comissão reduzida
  if (/(^| )campanha( |$)/.test(n) || (ehQuantidade && /(^| )0 1(0)?( |$)/.test(n))) {
    return "campanha";
  }
  const campos = Object.keys(SINONIMOS) as (keyof typeof SINONIMOS)[];
  for (const campo of campos) {
    if (SINONIMOS[campo].includes(n)) return campo;
  }
  for (const campo of campos) {
    if (SINONIMOS[campo].some((s) => n.startsWith(s))) return campo;
  }
  return null;
}


const CONECTIVOS = new Set(["da", "de", "do", "das", "dos", "e"]);

/** "  maria  DA silva " -> "Maria da Silva" */
export function formatarNome(texto: unknown) {
  return String(texto ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .split(" ")
    .map((p, i) =>
      i > 0 && CONECTIVOS.has(p) ? p : p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1),
    )
    .join(" ");
}

function iso(a: number, m: number, d: number) {
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Aceita número de série do Excel, dd/mm/aaaa, dd/mm/aa, dd-mm-aaaa e aaaa-mm-dd. */
export function lerData(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number" && Number.isFinite(valor)) {
    const ms = Math.round((valor - 25569) * 86400000); // 25569 = 1970-01-01 no Excel
    const d = new Date(ms);
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(valor).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const anoTxt = m[3] ?? "";
    const ano = anoTxt.length === 2 ? 2000 + Number(anoTxt) : Number(anoTxt);
    return iso(ano, Number(m[2]), Number(m[1]));
  }
  if (/^\d+(\.\d+)?$/.test(s)) return lerData(Number(s));
  return null;
}

/** Aceita 12, "12", "1.234", "12,0". Retorna null se não for inteiro >= 0. */
export function lerQuantidade(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isInteger(valor) && valor >= 0 ? valor : null;
  }
  const s = String(valor ?? "").trim();
  if (!s) return null;
  const limpo = s.replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Converte as linhas de uma planilha (primeira aba, como matriz) em vendas.
 * A coluna de data é opcional: sem ela, usa `dataPadrao`.
 * Aceita uma coluna de quantidade normal (R$ 0,20) e/ou uma de campanha (R$ 0,10).
 */
export function lerLinhasPlanilha(linhas: unknown[][], dataPadrao: string): ResultadoPlanilha {
  const erros: string[] = [];
  const vendas: LinhaVenda[] = [];

  const idxCabecalho = linhas.findIndex((linha) => {
    const campos = (linha ?? []).map(identificarCampo);
    return campos.includes("vendedor") && (campos.includes("quantidade") || campos.includes("campanha"));
  });

  if (idxCabecalho === -1) {
    return {
      vendas,
      erros: [
        "Não encontrei o cabeçalho. A planilha precisa ter as colunas Vendedor, Loja e Quantidade (Data é opcional).",
      ],
    };
  }

  const colunas: Partial<Record<Campo, number>> = {};
  (linhas[idxCabecalho] ?? []).forEach((c, i) => {
    const campo = identificarCampo(c);
    if (campo && colunas[campo] === undefined) colunas[campo] = i;
  });

  if (colunas.loja === undefined) {
    return { vendas, erros: ["Falta a coluna Loja na planilha."] };
  }

  const duasColunas = colunas.quantidade !== undefined && colunas.campanha !== undefined;
  const vazio = (v: unknown) => v === null || v === undefined || String(v).trim() === "";
  // Com as duas colunas, célula em branco vale 0; com uma só, é obrigatória.
  const lerColuna = (linha: unknown[], idx: number | undefined) => {
    if (idx === undefined) return 0;
    const valor = linha[idx];
    if (duasColunas && vazio(valor)) return 0;
    return lerQuantidade(valor);
  };

  for (let i = idxCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    const numLinha = i + 1;
    if (linha.every(vazio)) continue;

    const vendedor = formatarNome(linha[colunas.vendedor!]);
    const loja = formatarNome(linha[colunas.loja]);
    const normal = lerColuna(linha, colunas.quantidade);
    const campanha = lerColuna(linha, colunas.campanha);
    const valorData = colunas.data !== undefined ? linha[colunas.data] : undefined;
    const data = vazio(valorData) ? dataPadrao : lerData(valorData);

    if (!vendedor) {
      erros.push(`Linha ${numLinha}: vendedor em branco.`);
      continue;
    }
    if (!loja) {
      erros.push(`Linha ${numLinha}: loja em branco.`);
      continue;
    }
    if (normal === null) {
      erros.push(`Linha ${numLinha}: quantidade inválida ("${linha[colunas.quantidade!] ?? ""}").`);
      continue;
    }
    if (campanha === null) {
      erros.push(`Linha ${numLinha}: quantidade de campanha inválida ("${linha[colunas.campanha!] ?? ""}").`);
      continue;
    }
    if (!data) {
      erros.push(`Linha ${numLinha}: data inválida ("${valorData}"). Use dd/mm/aaaa.`);
      continue;
    }
    vendas.push({ data, vendedor, loja, quantidade: normal + campanha, quantidade_campanha: campanha });
  }

  return { vendas, erros };
}
