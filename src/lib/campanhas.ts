// Itens de cada campanha mensal, exibidos na faixa de produtos da página inicial.
import canudoChocolate from "@/assets/campanha/canudo-dodele-chocolate.png.asset.json";
import canudoDoceDeLeite from "@/assets/campanha/canudo-dodele-doce-de-leite.png.asset.json";
import tuttiFrutti from "@/assets/campanha/fini-tutti-frutti-35g.png.asset.json";
import sonhoDeValsa from "@/assets/campanha/sonho-de-valsa-20g.png.asset.json";
import ouroBranco from "@/assets/campanha/ouro-branco-20g.png.asset.json";
import peDeMoca from "@/assets/campanha/pe-de-moca-dodele.png.asset.json";

export type ItemCampanha = { nome: string; imagem: string };
export type Campanha = { nome: string; itens: ItemCampanha[] };

/** Campanha por mês (AAAA-MM). */
const CAMPANHAS: Record<string, Campanha> = {
  "2026-11": {
    nome: "ATIVA PDV NOVEMBRO",
    itens: [
      { nome: "Canudo Dodele Chocolate", imagem: canudoChocolate.url },
      { nome: "Canudo Dodele Doce de Leite", imagem: canudoDoceDeLeite.url },
      { nome: "Fini Tutti Frutti 35g", imagem: tuttiFrutti.url },
      { nome: "Sonho de Valsa 20g", imagem: sonhoDeValsa.url },
      { nome: "Ouro Branco 20g", imagem: ouroBranco.url },
      { nome: "Pé de Moça Dodele", imagem: peDeMoca.url },
    ],
  },
};

export function campanhaDoMes(mes: string): Campanha | null {
  return CAMPANHAS[mes.slice(0, 7)] ?? null;
}
