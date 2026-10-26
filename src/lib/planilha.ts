export type LinhaVenda = {
  data: string; // YYYY-MM-DD
  vendedor: string;
  loja: string;
  quantidade: number;
};

export type ResultadoPlanilha = {
  vendas: LinhaVenda[];
  erros: string[];
};

type Campo = "data" | "vendedor" | "loja" | "quantidade";

const SINONIMOS: Record<Campo, string[]> = {
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
  for (const campo of Object.keys(SINONIMOS) as Campo[]) {
    if (SINONIMOS[campo].includes(n)) return campo;
  }
  for (const campo of Object.keys(SINONIMOS) as Campo[]) {
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
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (m) {
    const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return iso(ano, +m[2], +m[1]);
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
 */
export function lerLinhasPlanilha(linhas: unknown[][], dataPadrao: string): ResultadoPlanilha {
  const erros: string[] = [];
  const vendas: LinhaVenda[] = [];

  const idxCabecalho = linhas.findIndex((linha) => {
    const campos = (linha ?? []).map(identificarCampo);
    return campos.includes("vendedor") && campos.includes("quantidade");
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
  linhas[idxCabecalho].forEach((c, i) => {
    const campo = identificarCampo(c);
    if (campo && colunas[campo] === undefined) colunas[campo] = i;
  });

  if (colunas.loja === undefined) {
    return { vendas, erros: ["Falta a coluna Loja na planilha."] };
  }

  for (let i = idxCabecalho + 1; i < linhas.length; i++) {
    const linha = linhas[i] ?? [];
    const numLinha = i + 1;
    const vazia = linha.every((c) => c === null || c === undefined || String(c).trim() === "");
    if (vazia) continue;

    const vendedor = formatarNome(linha[colunas.vendedor!]);
    const loja = formatarNome(linha[colunas.loja]);
    const quantidade = lerQuantidade(linha[colunas.quantidade!]);
    const valorData = colunas.data !== undefined ? linha[colunas.data] : undefined;
    const data =
      valorData === undefined || valorData === null || String(valorData).trim() === ""
        ? dataPadrao
        : lerData(valorData);

    if (!vendedor) {
      erros.push(`Linha ${numLinha}: vendedor em branco.`);
      continue;
    }
    if (!loja) {
      erros.push(`Linha ${numLinha}: loja em branco.`);
      continue;
    }
    if (quantidade === null) {
      erros.push(`Linha ${numLinha}: quantidade inválida ("${linha[colunas.quantidade!] ?? ""}").`);
      continue;
    }
    if (!data) {
      erros.push(`Linha ${numLinha}: data inválida ("${valorData}"). Use dd/mm/aaaa.`);
      continue;
    }
    vendas.push({ data, vendedor, loja, quantidade });
  }

  return { vendas, erros };
}
