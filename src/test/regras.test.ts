import { describe, expect, it } from "vitest";
import { comissaoLoja, comissaoVendedor, progressoMeta } from "@/lib/comissao";
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
      { data: "2026-10-26", vendedor: "Maria da Silva", loja: "Loja Centro", quantidade: 5 },
    ]);
    expect(r.erros).toHaveLength(1);
  });
});
