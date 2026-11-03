import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { baixarImagem, compartilharImagem, gerarCardPodio } from "@/lib/card-compartilhavel";
import { dataBR, diaDaSemana } from "@/lib/datas";
import { painelDiaQuery } from "@/lib/painel.functions";
import { cn } from "@/lib/utils";

/** Botão que monta a imagem do Pódio do Dia + Loja destaque, pronta para o WhatsApp. */
export function CompartilharPodio({ data, className }: { data: string | null; className?: string }) {
  const queryClient = useQueryClient();
  const [gerando, setGerando] = useState(false);
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const nomeArquivo = data ? `podio-do-dia-${data}.png` : "podio-do-dia.png";
  const texto = data ? `🏆 Pódio do dia ${dataBR(data)} · Ativa PDV` : "🏆 Pódio do dia · Ativa PDV";

  useEffect(() => () => {
    if (card) URL.revokeObjectURL(card.url);
  }, [card]);

  async function gerar() {
    if (!data) return;
    setGerando(true);
    try {
      const dia = await queryClient.fetchQuery(painelDiaQuery(data));
      if (!dia.vendedores.length) {
        toast.error("Ainda não há vendas neste dia.");
        return;
      }
      const loja = dia.lojas[0];
      const blob = await gerarCardPodio({
        rotuloData: `${diaDaSemana(data)} · ${dataBR(data)}`.replace(/^./, (c) => c.toUpperCase()),
        podio: dia.vendedores.slice(0, 3),
        loja: loja ? { loja: loja.loja, quantidade: loja.quantidade, vendedores: loja.vendedores } : null,
        total: dia.total,
      });
      setCard({ blob, url: URL.createObjectURL(blob) });
    } catch {
      toast.error("Não foi possível gerar a imagem.");
    } finally {
      setGerando(false);
    }
  }

  async function enviar() {
    if (!card) return;
    const r = await compartilharImagem(card.blob, nomeArquivo, texto);
    if (r === "baixado") toast.success("Imagem baixada. É só anexar no grupo do WhatsApp.");
  }

  return (
    <>
      <Button
        variant="fire"
        className={cn("rounded-full", className)}
        disabled={!data || gerando}
        onClick={gerar}
      >
        {gerando ? <Loader2 className="animate-spin" /> : <Share2 />}
        Compartilhar no WhatsApp
      </Button>
      <Dialog open={!!card} onOpenChange={(o) => !o && setCard(null)}>
        <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pódio do dia</DialogTitle>
            <DialogDescription>Imagem pronta para enviar nos grupos.</DialogDescription>
          </DialogHeader>
          {card && (
            <img src={card.url} alt="Imagem do pódio do dia" className="w-full rounded-xl border border-border" />
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="fire" onClick={enviar}>
              <Share2 /> Enviar
            </Button>
            <Button variant="outline" onClick={() => card && baixarImagem(card.blob, nomeArquivo)}>
              <Download /> Baixar imagem
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
