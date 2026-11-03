import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Megaphone, Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatarNumero } from "@/lib/comissao";
import { mesAtualSP, nomeMes } from "@/lib/datas";
import { produtosMercaflow } from "@/lib/mercaflow.functions";

type Produto = {
  id: string;
  nome: string;
  imagem_url: string | null;
  id_produto_mercaflow: number | null;
  meta: number | null;
  ordem: number;
};

const BUCKET = "campanha-produtos";
/** Link da foto válido por 10 anos (o bucket é privado). */
const VALIDADE_FOTO_S = 10 * 365 * 24 * 3600;

const campanhaAdminQuery = (mes: string) => ({
  queryKey: ["admin-campanha", mes],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("campanhas")
      .select("id, nome, campanha_produtos(id, nome, imagem_url, id_produto_mercaflow, meta, ordem)")
      .eq("mes", `${mes}-01`)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const produtos = [...(data.campanha_produtos ?? [])].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
    return { id: data.id, nome: data.nome, produtos: produtos as Produto[] };
  },
});

export function CampanhasAdmin() {
  const queryClient = useQueryClient();
  const [mes, setMes] = useState(mesAtualSP());
  const { data: campanha, isLoading } = useQuery(campanhaAdminQuery(mes));
  const [nome, setNome] = useState("");
  const [editando, setEditando] = useState<Produto | null>(null);

  const listar = useServerFn(produtosMercaflow);
  const { data: mercaflow } = useQuery({
    queryKey: ["admin-produtos-mercaflow"],
    queryFn: () => listar(),
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    setNome(campanha?.nome ?? "");
    setEditando(null);
  }, [campanha?.id, campanha?.nome]);

  const atualizar = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-campanha", mes] });
    queryClient.invalidateQueries({ queryKey: ["campanha", mes] });
  };

  async function salvarCampanha(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) {
      toast.error("Dê um nome para a campanha.");
      return;
    }
    const { error } = campanha
      ? await supabase.from("campanhas").update({ nome: n }).eq("id", campanha.id)
      : await supabase.from("campanhas").insert({ mes: `${mes}-01`, nome: n });
    if (error) {
      toast.error("Não foi possível salvar a campanha.");
      return;
    }
    toast.success(campanha ? "Campanha atualizada." : `Campanha de ${nomeMes(mes)} criada!`);
    atualizar();
  }

  async function excluir(p: Produto) {
    if (!confirm(`Remover "${p.nome}" da campanha?`)) return;
    const { error } = await supabase.from("campanha_produtos").delete().eq("id", p.id);
    if (error) {
      toast.error("Não foi possível remover o produto.");
      return;
    }
    toast.success("Produto removido.");
    atualizar();
  }

  async function mover(i: number, delta: -1 | 1) {
    if (!campanha) return;
    const lista = [...campanha.produtos];
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j]!, lista[i]!];
    const results = await Promise.all(
      lista.map((p, k) => supabase.from("campanha_produtos").update({ ordem: k + 1 }).eq("id", p.id)),
    );
    if (results.some((r) => r.error)) toast.error("Não foi possível reordenar.");
    atualizar();
  }

  const nomeMercaflow = (id: number | null) =>
    id === null ? null : (mercaflow?.produtos.find((p) => p.idProduto === id)?.descricao ?? `Produto ${id}`);

  return (
    <section className="surface p-6 md:p-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Megaphone className="size-4 text-sun" /> Campanhas e produtos foco
      </div>

      <form onSubmit={salvarCampanha} className="mt-4 grid gap-3 sm:grid-cols-[11rem_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="campanha-mes">Mês</Label>
          <Input id="campanha-mes" type="month" value={mes} onChange={(e) => e.target.value && setMes(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="campanha-nome">Nome da campanha</Label>
          <Input
            id="campanha-nome"
            placeholder="Ex.: ATIVA PDV DEZEMBRO"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <Button type="submit" variant="fire">
          {campanha ? "Salvar nome" : "Criar campanha"}
        </Button>
      </form>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Carregando...</p>
      ) : !campanha ? (
        <p className="mt-5 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Nenhuma campanha em {nomeMes(mes)}. Crie uma para cadastrar os produtos que aparecem na página inicial.
        </p>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-border">
            {campanha.produtos.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted/60 p-1">
                  {p.imagem_url ? (
                    <img src={p.imagem_url} alt={p.nome} className="h-full w-full object-contain" />
                  ) : (
                    <Package className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.nome}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.id_produto_mercaflow !== null ? `Mercaflow: ${nomeMercaflow(p.id_produto_mercaflow)}` : "Sem produto do Mercaflow"}
                    {p.meta ? ` · Meta ${formatarNumero(p.meta)} un.` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button size="icon" variant="ghost" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Descer"
                    disabled={i === campanha.produtos.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Editar ${p.nome}`} onClick={() => setEditando(p)}>
                    <Pencil />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Remover ${p.nome}`} onClick={() => excluir(p)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
            {campanha.produtos.length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">Nenhum produto cadastrado ainda.</li>
            )}
          </ul>

          <FormProduto
            key={editando?.id ?? "novo"}
            campanhaId={campanha.id}
            proximaOrdem={(campanha.produtos.at(-1)?.ordem ?? 0) + 1}
            produto={editando}
            mercaflow={mercaflow?.produtos ?? []}
            erroMercaflow={mercaflow && !mercaflow.ok ? mercaflow.erro : undefined}
            aoSalvar={() => {
              setEditando(null);
              atualizar();
            }}
            aoCancelar={() => setEditando(null)}
          />
        </>
      )}
    </section>
  );
}

function FormProduto({
  campanhaId,
  proximaOrdem,
  produto,
  mercaflow,
  erroMercaflow,
  aoSalvar,
  aoCancelar,
}: {
  campanhaId: string;
  proximaOrdem: number;
  produto: Produto | null;
  mercaflow: { idProduto: number; descricao: string }[];
  erroMercaflow?: string | undefined;
  aoSalvar: () => void;
  aoCancelar: () => void;
}) {
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [idProduto, setIdProduto] = useState(produto?.id_produto_mercaflow?.toString() ?? "");
  const [meta, setMeta] = useState(produto?.meta?.toString() ?? "");
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(produto?.imagem_url ?? null);
  const [salvando, setSalvando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!foto) return;
    const url = URL.createObjectURL(foto);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  async function enviarFoto(arquivo: File) {
    const ext = (arquivo.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const caminho = `${campanhaId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
      contentType: arquivo.type || "image/png",
      upsert: false,
    });
    if (error) throw error;
    const { data, error: erroLink } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, VALIDADE_FOTO_S);
    if (erroLink || !data) throw erroLink ?? new Error("sem link");
    return data.signedUrl;
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim();
    if (!n) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const metaNum = meta ? Number(meta) : null;
    if (metaNum !== null && (!Number.isInteger(metaNum) || metaNum <= 0)) {
      {
      toast.error("A meta do produto deve ser um número inteiro de unidades.");
      return;
    }
    }
    const idNum = idProduto ? Number(idProduto) : null;
    if (idNum !== null && (!Number.isInteger(idNum) || idNum <= 0)) {
      {
      toast.error("Código do produto no Mercaflow inválido.");
      return;
    }
    }
    if (foto && foto.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter até 5 MB.");
      return;
    }
    setSalvando(true);
    try {
      const imagem_url = foto ? await enviarFoto(foto) : (produto?.imagem_url ?? null);
      const campos = { nome: n, imagem_url, id_produto_mercaflow: idNum, meta: metaNum };
      const { error } = produto
        ? await supabase.from("campanha_produtos").update(campos).eq("id", produto.id)
        : await supabase.from("campanha_produtos").insert({ ...campos, campanha_id: campanhaId, ordem: proximaOrdem });
      if (error) throw error;
      toast.success(produto ? "Produto atualizado." : "Produto adicionado à campanha!");
      aoSalvar();
    } catch {
      toast.error("Não foi possível salvar o produto.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="mt-4 rounded-2xl border border-border bg-muted/30 p-4">
      <p className="text-sm font-bold">{produto ? `Editar ${produto.nome}` : "Adicionar produto foco"}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[6rem_1fr]">
        <button
          type="button"
          onClick={() => inputFoto.current?.click()}
          className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-dashed border-ember/60 bg-card/60 p-1 text-muted-foreground hover:border-sun"
          aria-label="Escolher foto"
        >
          {previa ? <img src={previa} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="size-6" />}
        </button>
        <input
          ref={inputFoto}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
        />
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="produto-mf">Produto no Mercaflow</Label>
            <select
              id="produto-mf"
              value={idProduto}
              onChange={(e) => {
                setIdProduto(e.target.value);
                const p = mercaflow.find((m) => String(m.idProduto) === e.target.value);
                if (p && !nome.trim()) setNome(p.descricao);
              }}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">Nenhum (só aparece na faixa)</option>
              {mercaflow.map((m) => (
                <option key={m.idProduto} value={m.idProduto}>
                  {m.descricao} ({m.idProduto})
                </option>
              ))}
              {idProduto && !mercaflow.some((m) => String(m.idProduto) === idProduto) && (
                <option value={idProduto}>Produto {idProduto}</option>
              )}
            </select>
            {erroMercaflow && <p className="text-xs text-destructive">{erroMercaflow}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div className="space-y-1.5">
              <Label htmlFor="produto-nome">Nome exibido</Label>
              <Input id="produto-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sonho de Valsa 20g" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="produto-meta">Meta (un.)</Label>
              <Input
                id="produto-meta"
                inputMode="numeric"
                placeholder="Opcional"
                value={meta}
                onChange={(e) => setMeta(e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" variant="fire" disabled={salvando}>
          {salvando ? "Salvando..." : produto ? "Salvar alterações" : "Adicionar produto"}
        </Button>
        {produto && (
          <Button type="button" variant="ghost" className="rounded-full" onClick={aoCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
