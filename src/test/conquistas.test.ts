import { describe, expect, it } from "vitest";
import { faixaDe, posicaoCom, proximaFaixa, selosDoRanking } from "@/lib/conquistas";
import { ritmoMeta } from "@/lib/comissao";

describe("faixas de conquista", () => {
  it("Bronze a partir de 300, Prata 600, Ouro 1.000, Diamante 2.000 unidades no mês", () => {
    expect(faixaDe(299)).toBeNull();
    expect(faixaDe(300)?.id).toBe("bronze");
    expect(faixaDe(600)?.id).toBe("prata");
    expect(faixaDe(999)?.id).toBe("prata");
    expect(faixaDe(1000)?.id).toBe("ouro");
    expect(faixaDe(2000)?.id).toBe("diamante");
  });

  it("mostra quanto falta para a próxima faixa", () => {
    expect(proximaFaixa(850)).toMatchObject({ faixa: { id: "ouro" }, faltam: 150 });
    expect(proximaFaixa(100)).toMatchObject({ faixa: { id: "bronze" }, faltam: 200 });
    expect(proximaFaixa(2500)).toBeNull();
  });
});

describe("selos do ranking", () => {
  const ranking = [
    { vendedor: "Ana", loja: "Loja A", quantidade: 1200, dias: 9 },
    { vendedor: "Bia", loja: "Loja B", quantidade: 700, dias: 5 },
    { vendedor: "Caio", loja: "Loja A", quantidade: 400, dias: 10 },
  ];
  const selos = selosDoRanking(ranking, { destaqueDoDia: "Bia", diasComVenda: 10 });
  const ids = (n: string) => selos.get(n)?.map((s) => s.id);

  it("o primeiro de cada loja ganha Nº 1 da loja", () => {
    expect(ids("Ana")).toContain("lider-loja");
    expect(ids("Bia")).toContain("lider-loja");
    expect(ids("Caio")).not.toContain("lider-loja");
  });

  it("constante = vendeu em pelo menos 80% dos dias com venda do mês", () => {
    expect(ids("Ana")).toContain("constante"); // 9 de 10
    expect(ids("Caio")).toContain("constante"); // 10 de 10
    expect(ids("Bia")).not.toContain("constante"); // 5 de 10
  });

  it("marca o destaque do dia", () => {
    expect(ids("Bia")).toContain("destaque");
    expect(ids("Ana")).not.toContain("destaque");
  });
});

describe("simulador", () => {
  it("estima a posição com as unidades simuladas", () => {
    const ranking = [
      { vendedor: "Ana", quantidade: 1200 },
      { vendedor: "Bia", quantidade: 700 },
      { vendedor: "Caio", quantidade: 400 },
    ];
    expect(posicaoCom(400, "Caio", ranking)).toBe(3);
    expect(posicaoCom(800, "Caio", ranking)).toBe(2);
    expect(posicaoCom(1300, "Caio", ranking)).toBe(1);
  });
});

describe("ritmo e projeção da meta", () => {
  it("projeta o fechamento pelo ritmo médio até hoje", () => {
    // 10 dias de 30, 3.000 un. => 300/dia => 9.000 no mês
    const r = ritmoMeta(3000, 10000, 10, 30);
    expect(r.ritmoAtual).toBe(300);
    expect(r.projecao).toBe(9000);
    expect(r.projecaoPct).toBe(90);
    expect(r.situacao).toBe("abaixo");
  });

  it("ritmo necessário divide o que falta pelos dias restantes, contando hoje", () => {
    // faltam 7.000 em 21 dias (dia 10 ao 30)
    expect(ritmoMeta(3000, 10000, 10, 30).ritmoNecessario).toBe(334);
  });

  it("situação: acima com projeção ≥ 105%, no ritmo entre 95% e 105%, batida ao passar a meta", () => {
    expect(ritmoMeta(3600, 10000, 10, 30).situacao).toBe("acima");
    expect(ritmoMeta(3300, 10000, 10, 30).situacao).toBe("no-ritmo");
    expect(ritmoMeta(10000, 10000, 20, 30).situacao).toBe("batida");
    expect(ritmoMeta(500, null, 10, 30).situacao).toBe("sem-meta");
  });
});
