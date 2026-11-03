// Gera, no navegador, a imagem do "Pódio do dia" para enviar em grupos de WhatsApp.
import logo from "@/assets/ativa-pdv-logo.png.asset.json";
import { formatarNumero } from "@/lib/comissao";

export type DadosCard = {
  /** Ex.: "Segunda-feira · 02/11/2026" */
  rotuloData: string;
  podio: { vendedor: string; loja: string; quantidade: number }[];
  loja: { loja: string; quantidade: number; vendedores: number } | null;
  total: number;
};

const L = 1080;
const A = 1350;
// Cores fixas da imagem (o canvas não lê os tokens de tema do site).
const COR = {
  fundo1: "#1d0907",
  fundo2: "#2b0d0a",
  flame: "#ef3b2c",
  ember: "#ff8a1f",
  sun: "#ffd23a",
  texto: "#fff7ea",
  suave: "#c9a99a",
  cartao: "rgba(255,255,255,0.06)",
  ouro: "#ffd23a",
  prata: "#d7dbe4",
  bronze: "#d08a4a",
};

function carregarImagem(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function degradeFogo(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, COR.flame);
  g.addColorStop(0.5, COR.ember);
  g.addColorStop(1, COR.sun);
  return g;
}

function cortar(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  if (ctx.measureText(texto).width <= largura) return texto;
  let t = texto;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > largura) t = t.slice(0, -1);
  return `${t}…`;
}

/** Quebra o nome em até 2 linhas. */
function linhas(ctx: CanvasRenderingContext2D, texto: string, largura: number) {
  const palavras = texto.split(" ");
  const l1: string[] = [];
  while (palavras.length && ctx.measureText([...l1, palavras[0]].join(" ")).width <= largura) l1.push(palavras.shift()!);
  if (!l1.length) l1.push(palavras.shift() ?? "");
  const resto = palavras.join(" ");
  return resto ? [l1.join(" "), cortar(ctx, resto, largura)] : [l1.join(" ")];
}

function iniciais(nome: string) {
  const p = nome.split(" ").filter((x) => x.length > 2);
  return ((p[0]?.[0] ?? nome[0] ?? "") + (p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function gerarCardPodio(dados: DadosCard): Promise<Blob> {
  if (document.fonts) {
    await Promise.all([
      document.fonts.load("800 64px Unbounded"),
      document.fonts.load("700 32px Manrope"),
    ]).catch(() => undefined);
  }
  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d")!;
  const display = "Unbounded, system-ui, sans-serif";
  const sans = "Manrope, system-ui, sans-serif";

  // Fundo
  const fundo = ctx.createLinearGradient(0, 0, 0, A);
  fundo.addColorStop(0, COR.fundo2);
  fundo.addColorStop(1, COR.fundo1);
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, L, A);
  for (const [x, y, r, cor] of [
    [L * 0.15, 120, 520, "rgba(239,59,44,0.35)"],
    [L * 0.9, 380, 460, "rgba(255,210,58,0.18)"],
  ] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, cor);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L, A);
  }

  // Logo
  const img = await carregarImagem(logo.url);
  if (img) {
    const h = 96;
    const w = (img.width / img.height) * h;
    ctx.drawImage(img, (L - w) / 2, 60, w, h);
  }

  // Título
  ctx.textAlign = "center";
  ctx.font = `800 76px ${display}`;
  ctx.fillStyle = degradeFogo(ctx, 200, 0, 880, 0);
  ctx.fillText("PÓDIO DO DIA", L / 2, 260);
  ctx.font = `700 32px ${sans}`;
  ctx.fillStyle = COR.suave;
  ctx.fillText(dados.rotuloData, L / 2, 312);

  // Pódio: 2º, 1º, 3º
  const colunas = [
    { i: 1, x: 190, altura: 210, cor: COR.prata },
    { i: 0, x: 540, altura: 300, cor: COR.ouro },
    { i: 2, x: 890, altura: 150, cor: COR.bronze },
  ];
  const base = 960;
  for (const c of colunas) {
    const v = dados.podio[c.i];
    if (!v) continue;
    const topoBarra = base - c.altura;
    // barra
    retangulo(ctx, c.x - 150, topoBarra, 300, c.altura, 28);
    ctx.fillStyle = c.i === 0 ? degradeFogo(ctx, 0, base, 0, topoBarra) : COR.cartao;
    ctx.fill();
    ctx.font = `800 ${c.i === 0 ? 96 : 72}px ${display}`;
    ctx.fillStyle = c.i === 0 ? "#2a0d0a" : c.cor;
    ctx.fillText(`${c.i + 1}º`, c.x, topoBarra + (c.i === 0 ? 110 : 88));

    // avatar
    const raio = c.i === 0 ? 78 : 62;
    const cy = topoBarra - 250;
    ctx.beginPath();
    ctx.arc(c.x, cy, raio, 0, Math.PI * 2);
    ctx.fillStyle = COR.fundo2;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = c.cor;
    ctx.stroke();
    ctx.font = `800 ${c.i === 0 ? 50 : 40}px ${display}`;
    ctx.fillStyle = c.cor;
    ctx.fillText(iniciais(v.vendedor), c.x, cy + (c.i === 0 ? 18 : 14));

    // nome, loja, unidades
    ctx.font = `800 30px ${sans}`;
    ctx.fillStyle = COR.texto;
    const ls = linhas(ctx, v.vendedor, 290);
    ls.forEach((t, k) => ctx.fillText(t, c.x, cy + raio + 48 + k * 36));
    const yLoja = cy + raio + 48 + ls.length * 36;
    ctx.font = `600 24px ${sans}`;
    ctx.fillStyle = COR.suave;
    ctx.fillText(cortar(ctx, v.loja, 290), c.x, yLoja);
    ctx.font = `800 36px ${display}`;
    ctx.fillStyle = COR.sun;
    ctx.fillText(`${formatarNumero(v.quantidade)} un.`, c.x, yLoja + 52);
  }

  // Loja destaque
  if (dados.loja) {
    const y = 1010;
    retangulo(ctx, 70, y, L - 140, 200, 32);
    ctx.fillStyle = COR.cartao;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = degradeFogo(ctx, 70, 0, L - 70, 0);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.font = `800 24px ${sans}`;
    ctx.fillStyle = COR.ember;
    ctx.fillText("LOJA DESTAQUE DO DIA", 120, y + 58);
    ctx.font = `800 52px ${display}`;
    ctx.fillStyle = COR.texto;
    ctx.fillText(cortar(ctx, dados.loja.loja, 560), 120, y + 128);
    ctx.font = `600 26px ${sans}`;
    ctx.fillStyle = COR.suave;
    ctx.fillText(`${dados.loja.vendedores} ${dados.loja.vendedores === 1 ? "vendedor" : "vendedores"} no dia`, 120, y + 172);
    ctx.textAlign = "right";
    ctx.font = `800 64px ${display}`;
    ctx.fillStyle = degradeFogo(ctx, 700, 0, L - 120, 0);
    ctx.fillText(formatarNumero(dados.loja.quantidade), L - 120, y + 120);
    ctx.font = `700 26px ${sans}`;
    ctx.fillStyle = COR.suave;
    ctx.fillText("unidades", L - 120, y + 160);
  }

  // Rodapé
  ctx.textAlign = "center";
  ctx.font = `700 26px ${sans}`;
  ctx.fillStyle = COR.suave;
  ctx.fillText(`${formatarNumero(dados.total)} unidades vendidas no dia · ativapdv.app`, L / 2, A - 60);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Não foi possível gerar a imagem."))), "image/png"),
  );
}

/** Abre o menu de compartilhar do celular (WhatsApp etc.) ou baixa a imagem no computador. */
export async function compartilharImagem(blob: Blob, nomeArquivo: string, texto: string) {
  const arquivo = new File([blob], nomeArquivo, { type: "image/png" });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], text: texto });
      return "compartilhado" as const;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelado" as const;
    }
  }
  baixarImagem(blob, nomeArquivo);
  return "baixado" as const;
}

export function baixarImagem(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
