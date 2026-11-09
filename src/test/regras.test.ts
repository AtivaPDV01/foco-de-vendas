import { describe, expect, it } from "vitest";
import { comissaoLoja, comissaoVendedor, progressoMeta, regraComissaoLoja, regraComissaoVendedor } from "@/lib/comissao";
import { lerData, lerLinhasPlanilha, lerQuantidade } from "@/lib/planilha";

describe("comissões", () => {
  it("vendedor ganha R$ 0,20 por unidade", () => {
    expect(comissaoVendedor(1)).toBe(0.2);
    expect(comissaoVendedor(37)).toBe(7.4);
  });

  it("loja ganha R$ 0,05 por unidade", () => {
    expect(comissaoLoja(1)).toBe(0.05);
    expect(comissaoLoja(250)).toBe(12.5);
  });

  it("item de campanha paga R$ 0,10 ao vendedor", () => {
    // 6 normais x 0,20 + 4 de campanha x 0,10
    expect(comissaoVendedor(10, 4)).toBe(1.6);
    expect(comissaoVendedor(3, 3)).toBe(0.3);
  });

  it("item de campanha paga metade (R$ 0,025) à loja", () => {
    // 6 normais x 0,05 + 4 de campanha x 0,025
    expect(comissaoLoja(10, 4)).toBe(0.4);
    expect(comissaoLoja(40, 40)).toBe(1);
  });
});

describe("regra de comissão por mês", () => {
  it("novembro: todos os itens a R$ 0,20 (vendedor) e R$ 0,05 (loja)", () => {
    expect(regraComissaoVendedor("2026-11")).toBe("R$ 0,20 por unidade");
    expect(regraComissaoLoja("2026-11-15")).toBe("R$ 0,05 por unidade");
  });

  it("outubro continua mostrando a comissão reduzida da campanha", () => {
    expect(regraComissaoVendedor("2026-10")).toBe("R$ 0,20 por unidade · R$ 0,10 na campanha");
    expect(regraComissaoLoja("2026-10")).toBe("R$ 0,05 por unidade · R$ 0,025 na campanha");
  });
});

describe("meta em quantidade", () => {
  it("calcula o percentual de unidades sobre a meta", () => {
    expect(progressoMeta(750, 1000)).toBe(75);
    expect(progressoMeta(10, null)).toBe(0);
  });
});

describe("leitura da planilha", () => {
  it("lê datas do Excel e no formato brasileiro", () => {
    expect(lerData(45658)).toBe("2025-01-01");
    expect(lerData("25/10/2026")).toBe("2026-10-25");
    expect(lerData("31/02/2026")).toBeNull();
  });

  it("aceita quantidades inteiras e rejeita fracionadas", () => {
    expect(lerQuantidade("1.234")).toBe(1234);
    expect(lerQuantidade(" 12 ")).toBe(12);
    expect(lerQuantidade("2,5")).toBeNull();
  });

  it("usa a data padrão quando a planilha não tem coluna de data", () => {
    const r = lerLinhasPlanilha(
      [
        ["Vendedor", "Loja", "Qtd"],
        ["maria DA silva", "loja centro", "5"],
        ["", "", ""],
        ["João", "Loja Centro", "abc"],
      ],
      "2026-10-26",
    );
    expect(r.vendas).toEqual([
      { data: "2026-10-26", vendedor: "Maria da Silva", loja: "Loja Centro", quantidade: 5, quantidade_campanha: 0 },
    ]);
    expect(r.erros).toHaveLength(1);
  });

  it("soma as colunas de R$ 0,20 e R$ 0,10 e guarda quantas são de campanha", () => {
    const r = lerLinhasPlanilha(
      [
        ["Data", "Vendedor", "Loja", "Quantidade R$ 0,20", "Quantidade R$ 0,10"],
        ["26/10/2026", "Ana", "Loja Centro", 5, 3],
        ["26/10/2026", "Bia", "Loja Centro", "", 2],
      ],
      "2026-10-01",
    );
    expect(r.erros).toEqual([]);
    expect(r.vendas).toEqual([
      { data: "2026-10-26", vendedor: "Ana", loja: "Loja Centro", quantidade: 8, quantidade_campanha: 3 },
      { data: "2026-10-26", vendedor: "Bia", loja: "Loja Centro", quantidade: 2, quantidade_campanha: 2 },
    ]);
  });
});
