import { describe, expect, it } from "vitest";
import { mensagemResumoLoja, normalizarTelefone, textoVariacao, type ResumoLoja } from "@/lib/whatsapp";

const base: ResumoLoja = {
  nome: "Carlos",
  loja: "01 Joao Paulo",
  unidadesOntem: 132,
  comissaoOntem: 6.6,
  posicao: 3,
  variacao: 1,
  novo: false,
  destaque: { vendedor: "Maria Silva", quantidade: 45 },
  meta: 2000,
  totalMes: 1240,
  lojaAFrente: { loja: "02 Shopping", faltam: 85 },
};

describe("normalizarTelefone", () => {
  it("remove tudo que não é dígito", () => {
    expect(normalizarTelefone("(11) 99999-0000")).toBe("5511999990000");
  });
  it("adiciona o DDI 55 quando vem só DDD + número", () => {
    expect(normalizarTelefone("11999990000")).toBe("5511999990000");
    expect(normalizarTelefone("1133334444")).toBe("551133334444");
  });
  it("não duplica o DDI quando já vem com 55", () => {
    expect(normalizarTelefone("5511999990000")).toBe("5511999990000");
  });
});

describe("textoVariacao", () => {
  it("mostra ▲ quando subiu, ▼ quando caiu, = quando manteve", () => {
    expect(textoVariacao(2, false)).toBe("▲2");
    expect(textoVariacao(-1, false)).toBe("▼1");
    expect(textoVariacao(0, false)).toBe("=");
  });
  it("mostra NOVO quando não estava no ranking de ontem", () => {
    expect(textoVariacao(null, true)).toBe("NOVO");
    expect(textoVariacao(null, false)).toBe("NOVO");
  });
});

describe("mensagemResumoLoja", () => {
  it("saúda pelo nome e traz os números da loja", () => {
    const msg = mensagemResumoLoja(base, 10);
    expect(msg).toContain("Bom dia, Carlos!");
    expect(msg).toContain("01 Joao Paulo");
    expect(msg).toContain("132 un.");
    expect(msg).toContain("3º ▲1");
    expect(msg).toContain("Maria Silva (45 un.)");
    expect(msg).toContain("62% (1.240 de 2.000 un.)");
    expect(msg).toContain("Faltam 85 un. pra passar a 02 Shopping!");
    expect(msg).toContain("Carlos!");
  });
  it("comemora a liderança quando a loja é a 1ª", () => {
    const msg = mensagemResumoLoja({ ...base, posicao: 1, lojaAFrente: null }, 10);
    expect(msg).toContain("Sua loja está na liderança!");
    expect(msg).not.toContain("Faltam");
  });
  it("marca NOVO quando a loja não estava no ranking de ontem", () => {
    const msg = mensagemResumoLoja({ ...base, variacao: null, novo: true }, 10);
    expect(msg).toContain("3º NOVO");
  });
  it("varia o fechamento conforme o dia do mês", () => {
    const dias = new Set([1, 2, 3, 4].map((d) => mensagemResumoLoja(base, d).split("\n").at(-1)));
    expect(dias.size).toBeGreaterThan(1);
  });
});
