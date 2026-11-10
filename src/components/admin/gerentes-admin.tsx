import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatarNumero } from "@/lib/comissao";
import { mesAtualSP } from "@/lib/datas";
import { painelQuery } from "@/lib/painel.functions";
import { mensagemResumoLoja } from "@/lib/whatsapp";
import { reenviarWhatsapp } from "@/lib/whatsapp.functions";

type Gerente = {
  id: string;
  loja: string;
  primeiro_nome: string;
  telefone: string;
  ativo: boolean;
};

type Log = {
  id: string;
  loja: string | null;
  telefone: string;
  status: string;
  erro: string | null;
  created_at: string;
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/** Cadastro de gerentes que recebem o resumo diário da loja no WhatsApp + registro de envios. */
export function GerentesAdmin() {
  const queryClient = useQueryClient();
  const reenviar = useServerFn(reenviarWhatsapp);
  const { data: painel } = useQuery(painelQuery(mesAtualSP()));
  const { data: gerentes } = useQuery({
    queryKey: ["gerentes"],
    queryFn: async () => {
      const { data } = await supabase.from("gerentes").select("*").order("loja");
      return (data ?? []) as Gerente[];
    },
  });
  const { data: logs } = useQuery({
    queryKey: ["whatsapp-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_logs").select("*").order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as Log[];
    },
  });

  const [loja, setLoja] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [reenviando, setReenviando] = useState<string | null>(null);

  const previa = mensagemResumoLoja(
    {
      nome: nome.trim() || "Ana",
      loja: loja.trim() || "Loja Centro",
      unidadesOntem: 132,
      comissaoOntem: 6.6,
      posicao: 3,
      variacao: 1,
      novo: false,
      destaque: { vendedor: "Maria Silva", quantidade: 45 },
      meta: 2000,
      totalMes: 1240,
      lojaAFrente: { loja: "Loja Shopping", faltam: 85 },
    },
    new Date().getDate(),
  );

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const fone = telefone.replace(/\D/g, "");
    if (!loja.trim() || !nome.trim() || fone.length < 10) {
      toast.error("Preencha loja, primeiro nome e telefone com DDD.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from("gerentes")
      .insert({ loja: loja.trim(), primeiro_nome: nome.trim(), telefone: fone });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar o gerente.");
      return;
    }
    toast.success(`${nome.trim()} cadastrado!`);
    setLoja("");
    setNome("");
    setTelefone("");
    queryClient.invalidateQueries({ queryKey: ["gerentes"] });
  }

  async function alternar(g: Gerente) {
    const { error } = await supabase.from("gerentes").update({ ativo: !g.ativo }).eq("id", g.id);
    if (error) toast.error("Não foi possível alterar.");
    queryClient.invalidateQueries({ queryKey: ["gerentes"] });
  }

  async function apagar(g: Gerente) {
    if (!window.confirm(`Remover ${g.primeiro_nome} (${g.loja})?`)) return;
    const { error } = await supabase.from("gerentes").delete().eq("id", g.id);
    if (error) toast.error("Não foi possível remover.");
    queryClient.invalidateQueries({ queryKey: ["gerentes"] });
  }

  async function reenviarLog(log: Log) {
    setReenviando(log.id);
    try {
      const r = await reenviar({ data: { logId: log.id } });
      if (r.ok) toast.success("Mensagem reenviada!");
      else toast.error(r.erro ?? "Não foi possível reenviar.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível reenviar.");
    } finally {
      setReenviando(null);
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
    }
  }

  return (
    <section className="surface p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <MessageCircle className="size-4 text-sun" /> Resumo diário no WhatsApp
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Todo dia às 08:00, cada gerente ativo recebe no WhatsApp o resumo de ontem da loja dele.
      </p>

      <form onSubmit={salvar} className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="g-loja">Loja</Label>
          <Input
            id="g-loja"
            list="lojas-conhecidas"
            placeholder="Ex.: 01 Joao Paulo"
            value={loja}
            onChange={(e) => setLoja(e.target.value)}
          />
          <datalist id="lojas-conhecidas">
            {(painel?.lojas ?? []).map((l) => (
              <option key={l.loja} value={l.loja} />
            ))}
          </datalist>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="g-nome">Primeiro nome</Label>
            <Input id="g-nome" placeholder="Ex.: Carlos" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-fone">Telefone com DDD</Label>
            <Input
              id="g-fone"
              inputMode="tel"
              placeholder="Ex.: 11 99999-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prévia da mensagem</p>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed">{previa}</p>
        </div>

        <Button type="submit" variant="fire" className="w-full" disabled={salvando}>
          {salvando ? "Salvando..." : "Cadastrar gerente"}
        </Button>
      </form>

      {gerentes && gerentes.length > 0 && (
        <ul className="mt-5 divide-y divide-border">
          {gerentes.map((g) => (
            <li key={g.id} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {g.primeiro_nome} <span className="font-normal text-muted-foreground">· {g.loja}</span>
                </p>
                <p className="text-xs text-muted-foreground">{g.telefone}</p>
              </div>
              <button
                type="button"
                onClick={() => alternar(g)}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  g.ativo ? "border-success/50 text-success" : "border-border text-muted-foreground"
                }`}
              >
                {g.ativo ? "Ativo" : "Pausado"}
              </button>
              <Button variant="ghost" size="icon" aria-label={`Remover ${g.primeiro_nome}`} onClick={() => apagar(g)}>
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Últimos envios</p>
        {!logs?.length ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum envio registrado ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-2 py-2.5">
                <span
                  className={`size-2 shrink-0 rounded-full ${l.status === "ok" ? "bg-success" : "bg-destructive"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.loja ?? l.telefone}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {dataHora(l.created_at)}
                    {l.erro ? ` · ${l.erro}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reenviar mensagem"
                  disabled={reenviando === l.id}
                  onClick={() => reenviarLog(l)}
                >
                  <Send className={reenviando === l.id ? "animate-pulse" : undefined} />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          {formatarNumero(logs?.length ?? 0)} envios recentes registrados.
        </p>
      </div>
    </section>
  );
}
