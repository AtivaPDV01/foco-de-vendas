// Itens de cada campanha mensal, exibidos na faixa de produtos da página inicial.
import canudoChocolate from "@/assets/campanha/canudo-chocolate.jpg";
import canudoDoceDeLeite from "@/assets/campanha/canudo-doce-de-leite.jpg";
import tuttiFrutti from "@/assets/campanha/tutti-frutti.jpg";
import bombomRosa from "@/assets/campanha/bombom-rosa.jpg";
import bombomDourado from "@/assets/campanha/bombom-dourado.jpg";
import peDeMoca from "@/assets/campanha/pe-de-moca.jpg";

export type ItemCampanha = { nome: string; imagem: string };
export type Campanha = { nome: string; itens: ItemCampanha[] };

/** Campanha por mês (AAAA-MM). */
const CAMPANHAS: Record<string, Campanha> = {
  "2026-11": {
    nome: "ATIVA PDV NOVEMBRO",
    itens: [
      { nome: "Canudo Dodele Chocolate", imagem: canudoChocolate },
      { nome: "Canudo Dodele Doce de Leite", imagem: canudoDoceDeLeite },
      { nome: "Fini Tutti Frutti 35g", imagem: tuttiFrutti },
      { nome: "Sonho de Valsa 20g", imagem: bombomRosa },
      { nome: "Ouro Branco 20g", imagem: bombomDourado },
      { nome: "Pé de Moça Dodele", imagem: peDeMoca },
    ],
  },
};

export function campanhaDoMes(mes: string): Campanha | null {
  return CAMPANHAS[mes.slice(0, 7)] ?? null;
}
