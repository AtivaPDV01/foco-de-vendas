import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, LogOut, Target, Trash2, Trophy, Upload } from "lucide-react";
import { Marca } from "@/components/marca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lerLinhasPlanilha, type ResultadoPlanilha } from "@/lib/planilha";
import { dataBR, hojeSP, mesAtualSP, nomeMes } from "@/lib/datas";
import { comissaoVendedor, formatarBRL, formatarNumero } from "@/lib/comissao";

const adminQuery = queryOptions({
  queryKey: ["admin"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id ?? "";
    const [papeis, importacoes, metas] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("importacoes").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("metas").select("*").order("mes", { ascending: false }).limit(12),
    ]);
    return {
      email: auth.user?.email ?? "",
      admin: (papeis.data ?? []).some((p) => p.role === "admin"),
      importacoes: importacoes.data ?? [],
      metas: metas.data ?? [],
    };
  },
});

export const Route = createFileRoute("/_authenticated/admin")({
  loader: ({ context }) => context.queryClient.ensureQueryData(adminQuery),
  head: () => ({
    meta: [
      { title: "Lançar vendas · Ativa PDV" },
      { name: "description", content: "Importe a planilha de vendas do dia e defina a meta do mês." },
      { property: "og:title", content: "Lançar vendas · Ativa PDV" },
      { property: "og:description", content: "Importe a planilha de vendas do dia e defina a meta do mês." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data } = useSuspenseQuery(adminQuery);
  const navigate = useNavigate();

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Marca />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="rounded-full">
            <Link to="/">
              <Trophy /> Ver ranking
            </Link>
          </Button>
          <Button variant="ghost" className="rounded-full" onClick={sair}>
            <LogOut /> Sair
          </Button>
        </div>
      </header>

      <h1 className="mt-10 font-display text-3xl font-black md:text-5xl">
        Lançar <span className="text-fire">vendas</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">Conectado como {data.email}</p>

      {!data.admin ? (
        <div className="surface mt-8 p-6 text-sm text-muted-foreground">
          Esta conta não tem permissão para lançar vendas. Apenas o responsável pode importar
          planilhas e definir metas.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Importar />
          <div className="space-y-5">
            <Metas metas={data.metas} />
            <Historico importacoes={data.importacoes} />
          </div>
        </div>
      )}
    </div>
  );
}

async function baixarModelo() {
  const XLSX = await import("xlsx");
  const hoje = dataBR(hojeSP());
  const ws = XLSX.utils.aoa_to_sheet([
    ["Data", "Vendedor", "Loja", "Quantidade R$ 0,20", "Quantidade R$ 0,10"],
    [hoje, "Maria Silva", "Loja Centro", 12, 3],
    [hoje, "João Souza", "Loja Shopping", 8, 0],
  ]);
  ws["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Vendas");
  XLSX.writeFile(wb, "modelo-vendas.xlsx");
}

function Importar() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dataPadrao, setDataPadrao] = useState(hojeSP());
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoPlanilha | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function ler(file: File, data: string) {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const ehTexto = /\.(csv|txt)$/i.test(file.name);
      const wb = XLSX.read(buf, { type: "array", raw: ehTexto });
      const aba = wb.SheetNames[0];
      const ws = aba ? wb.Sheets[aba] : undefined;
      if (!ws) throw new Error("planilha vazia");
      const linhas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
      setResultado(lerLinhasPlanilha(linhas, data));
    } catch {
      setResultado({ vendas: [], erros: ["Não consegui abrir este arquivo. Use .xlsx, .xls ou .csv."] });
    }
  }

  function aoEscolher(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    ler(file, dataPadrao);
  }

  function limpar() {
    setArquivo(null);
    setResultado(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function confirmar() {
    if (!arquivo || !resultado?.vendas.length) return;
    setSalvando(true);
    const unidades = resultado.vendas.reduce((s, v) => s + v.quantidade, 0);
    const { data: imp, error } = await supabase
      .from("importacoes")
      .insert({ arquivo: arquivo.name, linhas: resultado.vendas.length, unidades })
      .select("id")
      .single();
    if (error || !imp) {
      toast.error("Não foi possível registrar a importação.");
      setSalvando(false);
      return;
    }
    for (let i = 0; i < resultado.vendas.length; i += 500) {
      const lote = resultado.vendas.slice(i, i + 500).map((v) => ({ ...v, importacao_id: imp.id }));
      const { error: errLote } = await supabase.from("vendas").insert(lote);
      if (errLote) {
        await supabase.from("importacoes").delete().eq("id", imp.id);
        toast.error("Erro ao salvar as vendas. Nada foi importado.");
        setSalvando(false);
        return;
      }
    }
    toast.success(`${formatarNumero(unidades)} unidades importadas!`);
    setSalvando(false);
    limpar();
    queryClient.invalidateQueries({ queryKey: ["painel"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  const totalUnidades = resultado?.vendas.reduce((s, v) => s + v.quantidade, 0) ?? 0;
  const totalCampanha = resultado?.vendas.reduce((s, v) => s + v.quantidade_campanha, 0) ?? 0;
  const vendedores = new Set(resultado?.vendas.map((v) => v.vendedor)).size;

  return (
    <section className="surface glow p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <FileSpreadsheet className="size-4 text-sun" /> Importar planilha
        </div>
        <Button variant="ghost" size="sm" className="rounded-full" onClick={baixarModelo}>
          <Download /> Baixar modelo
        </Button>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Colunas: <b className="text-foreground">Data</b> (opcional), <b className="text-foreground">Vendedor</b>,{" "}
        <b className="text-foreground">Loja</b>, <b className="text-foreground">Quantidade R$ 0,20</b> e{" "}
        <b className="text-foreground">Quantidade R$ 0,10</b> (item da campanha). Linhas sem data usam a data
        abaixo.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[12rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="data">Data das vendas</Label>
          <Input
            id="data"
            type="date"
            value={dataPadrao}
            max={hojeSP()}
            onChange={(e) => {
              setDataPadrao(e.target.value);
              if (arquivo) ler(arquivo, e.target.value);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="arquivo">Arquivo (.xlsx, .xls ou .csv)</Label>
          <label
            htmlFor="arquivo"
            className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-dashed border-ember/60 bg-muted/40 px-3 text-sm text-muted-foreground hover:border-sun hover:text-foreground"
          >
            <Upload className="size-4" />
            <span className="truncate">{arquivo ? arquivo.name : "Escolher planilha"}</span>
          </label>
          <input
            ref={inputRef}
            id="arquivo"
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            className="sr-only"
            onChange={aoEscolher}
          />
        </div>
      </div>

      {resultado && (
        <div className="mt-6">
          {resultado.vendas.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Unidades R$ 0,20", totalUnidades - totalCampanha],
                  ["Unidades R$ 0,10", totalCampanha],
                  ["Total", totalUnidades],
                  ["Vendedores", vendedores],
                ].map(([rotulo, valor]) => (
                  <div key={rotulo} className="rounded-xl bg-muted/60 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{rotulo}</p>
                    <p className="font-display text-xl font-bold">{formatarNumero(Number(valor))}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-secondary text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Vendedor</th>
                      <th className="px-3 py-2">Loja</th>
                      <th className="px-3 py-2 text-right">R$ 0,20</th>
                      <th className="px-3 py-2 text-right">R$ 0,10</th>
                      <th className="px-3 py-2 text-right">Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resultado.vendas.slice(0, 100).map((v, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-muted-foreground">{dataBR(v.data)}</td>
                        <td className="px-3 py-2 font-medium">{v.vendedor}</td>
                        <td className="px-3 py-2 text-muted-foreground">{v.loja}</td>
                        <td className="px-3 py-2 text-right font-bold">{v.quantidade - v.quantidade_campanha}</td>
                        <td className="px-3 py-2 text-right font-bold">{v.quantidade_campanha}</td>
                        <td className="px-3 py-2 text-right font-bold text-sun">
                          {formatarBRL(comissaoVendedor(v.quantidade, v.quantidade_campanha))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {resultado.vendas.length > 100 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Mostrando 100 de {resultado.vendas.length} linhas.
                </p>
              )}
            </>
          )}

          {resultado.erros.length > 0 && (
            <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm">
              <p className="font-semibold">
                {resultado.erros.length} {resultado.erros.length === 1 ? "linha ignorada" : "linhas ignoradas"}
              </p>
              <ul className="mt-2 max-h-32 list-disc space-y-0.5 overflow-auto pl-5 text-muted-foreground">
                {resultado.erros.slice(0, 50).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="fire"
              size="lg"
              disabled={!resultado.vendas.length || salvando}
              onClick={confirmar}
            >
              {salvando ? "Importando..." : `Confirmar ${resultado.vendas.length} linhas`}
            </Button>
            <Button variant="ghost" size="lg" className="rounded-full" onClick={limpar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Metas({ metas }: { metas: { mes: string; quantidade: number }[] }) {
  const queryClient = useQueryClient();
  const atual = mesAtualSP();
  const [mes, setMes] = useState(atual);
  const existente = metas.find((m) => m.mes.slice(0, 7) === mes);
  const [quantidade, setQuantidade] = useState(existente ? String(existente.quantidade) : "");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const q = Number(quantidade);
    if (!Number.isInteger(q) || q <= 0) {
      toast.error("Informe uma meta em unidades (número inteiro).");
      return;
    }
    setSalvando(true);
    const { error } = await supabase
      .from("metas")
      .upsert({ mes: `${mes}-01`, quantidade: q, updated_at: new Date().toISOString() });
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar a meta.");
      return;
    }
    toast.success(`Meta de ${nomeMes(mes)} salva!`);
    queryClient.invalidateQueries({ queryKey: ["painel"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <section className="surface p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Target className="size-4 text-flame" /> Meta do mês (unidades)
      </div>
      <form onSubmit={salvar} className="mt-4 grid grid-cols-[1fr_1fr] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mes">Mês</Label>
          <Input
            id="mes"
            type="month"
            value={mes}
            onChange={(e) => {
              setMes(e.target.value);
              const m = metas.find((x) => x.mes.slice(0, 7) === e.target.value);
              setQuantidade(m ? String(m.quantidade) : "");
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="meta">Meta</Label>
          <Input
            id="meta"
            inputMode="numeric"
            placeholder="Ex.: 5000"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <Button type="submit" variant="fire" className="col-span-2" disabled={salvando}>
          {salvando ? "Salvando..." : existente ? "Atualizar meta" : "Salvar meta"}
        </Button>
      </form>
      {metas.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm">
          {metas.map((m) => (
            <li key={m.mes} className="flex justify-between text-muted-foreground">
              <span>{nomeMes(m.mes.slice(0, 7))}</span>
              <span className="font-semibold text-foreground">{formatarNumero(m.quantidade)} un.</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Historico({
  importacoes,
}: {
  importacoes: { id: string; arquivo: string; linhas: number; unidades: number; created_at: string }[];
}) {
  const queryClient = useQueryClient();

  async function apagar(id: string, arquivo: string) {
    if (!window.confirm(`Desfazer a importação "${arquivo}"? As vendas dela serão removidas.`)) return;
    const { error } = await supabase.from("importacoes").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível desfazer.");
      return;
    }
    toast.success("Importação desfeita.");
    queryClient.invalidateQueries({ queryKey: ["painel"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <section className="surface p-6">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <FileSpreadsheet className="size-4 text-ember" /> Últimas importações
      </div>
      {importacoes.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhuma planilha importada ainda.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {importacoes.map((imp) => (
            <li key={imp.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{imp.arquivo}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(imp.created_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  · {imp.linhas} linhas · {formatarNumero(imp.unidades)} un.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Desfazer ${imp.arquivo}`}
                onClick={() => apagar(imp.id, imp.arquivo)}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
