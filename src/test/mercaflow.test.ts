import { describe, expect, it } from "vitest";
import { montarLinhasMercaflow, produtosReduzidosDa, selecionarCampanhas } from "@/lib/mercaflow";

const campanhas = [
  { id: 92, nome: "Venda Ativa PDV Outubro", dataInicio: "2026-10-01", dataFim: "2026-10-20" },
  { id: 106, nome: "Venda Ativa PDV Outubro 2", dataInicio: "2026-10-21", dataFim: "2026-10-31" },
  { id: 107, nome: "SEMANA 22", dataInicio: "2026-10-26", dataFim: "2026-11-01" },
  { id: 42, nome: "Venda Ativa PDV Setembro 2", dataInicio: "2026-09-09", dataFim: "2026-09-30" },
];

describe("campanhas sincronizadas", () => {
  it("pega só as campanhas Venda Ativa PDV do mês atual", () => {
    expect(selecionarCampanhas(campanhas, "2026-10-29").map((c) => c.id)).toEqual([92, 106]);
  });

  it("continua sincronizando a campanha encerrada por 3 dias", () => {
    expect(selecionarCampanhas(campanhas, "2026-11-03").map((c) => c.id)).toEqual([106]);
    expect(selecionarCampanhas(campanhas, "2026-11-04").map((c) => c.id)).toEqual([]);
  });
});

describe("campanha de novembro", () => {
  const nov = [
    { id: 120, nome: "ATIVA PDV NOVEMBRO", dataInicio: "2026-11-01", dataFim: "2026-11-30" },
    { id: 121, nome: "SEMANA 23", dataInicio: "2026-11-02", dataFim: "2026-11-08" },
  ];

  it("reconhece a campanha ATIVA PDV NOVEMBRO", () => {
    expect(selecionarCampanhas(nov, "2026-11-10").map((c) => c.id)).toEqual([120]);
  });

  it("novembro não tem item com comissão reduzida; outubro mantém o Mendorato", () => {
    expect(produtosReduzidosDa(nov[0]!)).toEqual([]);
    expect(produtosReduzidosDa(campanhas[1]!)).toEqual([18714]);
  });
});

describe("linhas vindas do Mercaflow", () => {
  it("separa as unidades do item de campanha (R$ 0,10) do total", () => {
    const linhas = montarLinhasMercaflow(
      [{ matricula: 1, nome: "GABRIELA DE LIMA", lojaExternalId: 22, lojaNome: "13 JACARE", perDia: { "2026-10-21": 155, "2026-10-22": 227 } }],
      [{ matricula: 1, nome: "GABRIELA DE LIMA", lojaExternalId: 22, lojaNome: "13 JACARE", perDia: { "2026-10-21": 40 } }],
    );
    expect(linhas).toEqual([
      { data: "2026-10-21", vendedor: "Gabriela de Lima", loja: "13 Jacare", quantidade: 155, quantidade_campanha: 40 },
      { data: "2026-10-22", vendedor: "Gabriela de Lima", loja: "13 Jacare", quantidade: 227, quantidade_campanha: 0 },
    ]);
  });

  it("ignora dias fora do período da campanha", () => {
    const linhas = montarLinhasMercaflow(
      [{ matricula: 2, nome: "DANIELE", lojaExternalId: 1, lojaNome: "07 VAL CENTRO", perDia: { "2026-10-20": 10, "2026-10-21": 5 } }],
      [],
      { inicio: "2026-10-21", fim: "2026-10-31" },
    );
    expect(linhas.map((l) => [l.data, l.quantidade])).toEqual([["2026-10-21", 5]]);
  });
});

describe("venda por produto da campanha", () => {
  it("lê os produtos do detalhe da campanha sem repetir", async () => {
    const { produtosDaCampanha } = await import("@/lib/mercaflow");
    expect(
      produtosDaCampanha({
        produtos: [
          { idProduto: 200, descricao: "BOMBOM OURO BRANCO 20G - LACTA" },
          { idProduto: 200, descricao: "repetido" },
          { idProduto: "x", descricao: "inválido" },
        ],
      }),
    ).toEqual([{ idProduto: 200, descricao: "BOMBOM OURO BRANCO 20G - LACTA" }]);
  });

  it("gera uma linha por dia, vendedor e loja com nomes iguais aos do ranking", async () => {
    const { montarLinhasProduto } = await import("@/lib/mercaflow");
    const linhas = montarLinhasProduto(
      [{ matricula: 1, nome: "WILLIANE FERREIRA DE LIMA", lojaExternalId: 2, lojaNome: "08 BARAO GERALDO", perDia: { "2026-11-02": 51, "2026-10-31": 4 } }],
      { idProduto: 200, descricao: "BOMBOM OURO BRANCO 20G - LACTA" },
      { inicio: "2026-11-01", fim: "2026-11-30" },
    );
    expect(linhas).toEqual([
      { data: "2026-11-02", vendedor: "Williane Ferreira de Lima", loja: "08 Barao Geraldo", id_produto: 200, produto: "BOMBOM OURO BRANCO 20G - LACTA", quantidade: 51 },
    ]);
  });
});
