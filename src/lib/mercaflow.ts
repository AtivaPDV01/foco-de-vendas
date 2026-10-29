// Regras puras da sincronização com o Mercaflow (sem rede), cobertas por src/test/mercaflow.test.ts.
import { formatarNome, type LinhaVenda } from "@/lib/planilha";
import { somarDias } from "@/lib/datas";

export const NOME_IMPORTACAO_MERCAFLOW = "Sincronização Mercaflow";

/**
 * Produtos do Mercaflow (idProduto) que são o "item da campanha" e pagam comissão reduzida.
 * 18714 = AMENDOIM JAPONÊS MENDORATO 24G - SANTA HELENA.
 */
export const PRODUTOS_CAMPANHA_REDUZIDA = [18714];

/** Campanhas que entram na sincronização: o nome contém isto. */
const NOME_CAMPANHA = "venda ativa pdv";
/** Depois de encerrada, uma campanha continua sendo sincronizada por estes dias (lançamentos atrasados). */
const DIAS_APOS_FIM = 3;

export type CampanhaMercaflow = { id: number; nome: string; dataInicio: string; dataFim: string };

export type OperadorMercaflow = {
  matricula?: number | string | null;
  nome: string;
  lojaExternalId?: number | null;
  lojaNome: string;
  perDia: Record<string, number>;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Campanhas "Venda Ativa PDV" do mês atual: as que têm algum dia dentro do mês de `hoje`
 * ou que terminaram há no máximo 3 dias. Campanhas futuras ficam de fora.
 */
export function selecionarCampanhas(campanhas: CampanhaMercaflow[], hoje: string) {
  const inicioMes = `${hoje.slice(0, 7)}-01`;
  const limite = somarDias(hoje, -DIAS_APOS_FIM);
  return campanhas.filter((c) => {
    if (!ISO.test(c.dataInicio) || !ISO.test(c.dataFim)) return false;
    if (!normalizar(c.nome).includes(NOME_CAMPANHA)) return false;
    if (c.dataInicio > hoje) return false;
    return c.dataFim >= inicioMes || c.dataFim >= limite;
  });
}

function chaveOperador(o: OperadorMercaflow) {
  return `${o.matricula ?? normalizar(o.nome)}|${o.lojaExternalId ?? normalizar(o.lojaNome)}`;
}

function unidades(valor: unknown) {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * Junta a venda total por operador/dia com a venda só do item de campanha
 * e devolve uma linha por dia, vendedor e loja.
 */
export function montarLinhasMercaflow(
  total: OperadorMercaflow[],
  itemCampanha: OperadorMercaflow[],
  periodo?: { inicio: string; fim: string },
): LinhaVenda[] {
  const campanhaPorChave = new Map<string, Record<string, number>>();
  for (const o of itemCampanha) {
    const k = chaveOperador(o);
    const atual = campanhaPorChave.get(k) ?? {};
    for (const [dia, q] of Object.entries(o.perDia ?? {})) atual[dia] = (atual[dia] ?? 0) + unidades(q);
    campanhaPorChave.set(k, atual);
  }

  const linhas = new Map<string, LinhaVenda>();
  for (const o of total) {
    const vendedor = formatarNome(o.nome);
    const loja = formatarNome(o.lojaNome);
    if (!vendedor || !loja) continue;
    const camp = campanhaPorChave.get(chaveOperador(o)) ?? {};
    const dias = new Set([...Object.keys(o.perDia ?? {}), ...Object.keys(camp)]);
    for (const dia of dias) {
      if (!ISO.test(dia)) continue;
      if (periodo && (dia < periodo.inicio || dia > periodo.fim)) continue;
      const c = camp[dia] ?? 0;
      const q = Math.max(unidades(o.perDia?.[dia]), c);
      if (q === 0) continue;
      const k = `${dia}|${vendedor}|${loja}`;
      const atual = linhas.get(k);
      if (atual) {
        atual.quantidade += q;
        atual.quantidade_campanha += c;
      } else {
        linhas.set(k, { data: dia, vendedor, loja, quantidade: q, quantidade_campanha: c });
      }
    }
  }
  return [...linhas.values()].sort(
    (a, b) => a.data.localeCompare(b.data) || a.vendedor.localeCompare(b.vendedor),
  );
}
