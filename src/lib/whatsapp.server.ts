import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { comissaoLoja } from "@/lib/comissao";
import { hojeSP, mesAtualSP, somarDias } from "@/lib/datas";
import { mensagemResumoLoja, normalizarTelefone, type ResumoLoja } from "@/lib/whatsapp";

type LojaPainel = { loja: string; quantidade: number; campanha: number };

async function enviarTexto(telefone: string, mensagem: string) {
  const instancia = process.env["ZAPI_INSTANCE_ID"];
  const token = process.env["ZAPI_INSTANCE_TOKEN"];
  const clientToken = process.env["ZAPI_CLIENT_TOKEN"];
  if (!instancia || !token || !clientToken) {
    throw new Error("Z-API não configurada (instância, token ou client-token ausentes).");
  }
  const res = await fetch(`https://api.z-api.io/instances/${instancia}/token/${token}/send-text`, {
    method: "POST",
    headers: { "content-type": "application/json", "client-token": clientToken },
    body: JSON.stringify({ phone: normalizarTelefone(telefone), message: mensagem }),
  });
  if (!res.ok) {
    const corpo = (await res.text()).slice(0, 300);
    console.error(`Z-API send-text falhou [${res.status}]: ${corpo}`);
    throw new Error(`A Z-API recusou o envio (erro ${res.status}).`);
  }
}

/** Reúne os números da loja para a mensagem diária (ontem + acumulado do mês). */
export async function montarResumoLoja(nome: string, loja: string): Promise<ResumoLoja> {
  const ontem = somarDias(hojeSP(), -1);
  const mes = mesAtualSP();

  const [vendasOntem, painel, snap, metaLoja] = await Promise.all([
    supabaseAdmin.from("vendas").select("vendedor, quantidade, quantidade_campanha").eq("loja", loja).eq("data", ontem),
    supabaseAdmin.rpc("painel_mes", { _mes: `${mes}-01` }),
    supabaseAdmin.from("ranking_snapshot").select("id, posicao").eq("data", ontem).eq("tipo", "loja"),
    supabaseAdmin.from("metas_loja").select("quantidade").eq("mes", `${mes}-01`).eq("loja", loja).maybeSingle(),
  ]);

  const linhas = vendasOntem.data ?? [];
  const unidadesOntem = linhas.reduce((s, v) => s + v.quantidade, 0);
  const campanhaOntem = linhas.reduce((s, v) => s + v.quantidade_campanha, 0);

  const porVendedor = new Map<string, number>();
  for (const v of linhas) porVendedor.set(v.vendedor, (porVendedor.get(v.vendedor) ?? 0) + v.quantidade);
  const top = [...porVendedor.entries()].sort((a, b) => b[1] - a[1])[0];

  const lojas = ((painel.data as { lojas?: LojaPainel[] } | null)?.lojas ?? []) as LojaPainel[];
  const indice = lojas.findIndex((l) => l.loja === loja);
  const posicao = indice >= 0 ? indice + 1 : null;
  const posicaoOntem = (snap.data ?? []).find((s) => s.id === loja)?.posicao;
  const aFrente = indice > 0 ? lojas[indice - 1]! : null;
  const totalMes = indice >= 0 ? lojas[indice]!.quantidade : 0;

  return {
    nome,
    loja,
    unidadesOntem,
    comissaoOntem: comissaoLoja(unidadesOntem, campanhaOntem),
    posicao,
    variacao: posicao !== null && posicaoOntem !== undefined ? posicaoOntem - posicao : null,
    novo: posicao !== null && posicaoOntem === undefined,
    destaque: top ? { vendedor: top[0], quantidade: top[1] } : null,
    meta: metaLoja.data?.quantidade ?? null,
    totalMes,
    lojaAFrente: aFrente ? { loja: aFrente.loja, faltam: aFrente.quantidade - totalMes + 1 } : null,
  };
}

export type ResultadoEnvioGerentes = { ok: boolean; enviados: number; erros: number };

/** Envia o resumo diário a todos os gerentes ativos e registra cada envio. */
export async function enviarResumoGerentes(): Promise<ResultadoEnvioGerentes> {
  const { data: gerentes, error } = await supabaseAdmin
    .from("gerentes")
    .select("id, loja, primeiro_nome, telefone")
    .eq("ativo", true);
  if (error) throw new Error("Não foi possível ler os gerentes.");

  let enviados = 0;
  let erros = 0;
  for (const g of gerentes ?? []) {
    let mensagem = "";
    try {
      const resumo = await montarResumoLoja(g.primeiro_nome, g.loja);
      mensagem = mensagemResumoLoja(resumo, Number(hojeSP().slice(8, 10)));
      await enviarTexto(g.telefone, mensagem);
      enviados++;
      await supabaseAdmin.from("whatsapp_logs").insert({
        gerente_id: g.id, loja: g.loja, telefone: g.telefone, mensagem, status: "ok",
      });
    } catch (e) {
      erros++;
      const motivo = e instanceof Error ? e.message : "Erro desconhecido";
      console.error(`WhatsApp para ${g.primeiro_nome} (${g.loja}) falhou: ${motivo}`);
      await supabaseAdmin.from("whatsapp_logs").insert({
        gerente_id: g.id, loja: g.loja, telefone: g.telefone,
        mensagem: mensagem || "(mensagem não montada)", status: "erro", erro: motivo,
      });
    }
  }
  return { ok: erros === 0, enviados, erros };
}

/** Reenvia a mensagem de um log anterior (disparado pelo admin). */
export async function reenviarLog(logId: string): Promise<{ ok: boolean; erro?: string }> {
  const { data: log, error } = await supabaseAdmin
    .from("whatsapp_logs")
    .select("id, gerente_id, loja, telefone, mensagem")
    .eq("id", logId)
    .maybeSingle();
  if (error || !log) return { ok: false, erro: "Envio não encontrado." };
  try {
    await enviarTexto(log.telefone, log.mensagem);
    await supabaseAdmin.from("whatsapp_logs").insert({
      gerente_id: log.gerente_id, loja: log.loja, telefone: log.telefone,
      mensagem: log.mensagem, status: "ok",
    });
    return { ok: true };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : "Erro desconhecido";
    await supabaseAdmin.from("whatsapp_logs").insert({
      gerente_id: log.gerente_id, loja: log.loja, telefone: log.telefone,
      mensagem: log.mensagem, status: "erro", erro: motivo,
    });
    return { ok: false, erro: motivo };
  }
}
