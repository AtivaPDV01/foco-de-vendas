import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Botão "Instalar app" (Android/computador) ou dica de "Adicionar à Tela de Início" (iPhone). */
export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [instalado, setInstalado] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const aoPedir = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    const aoInstalar = () => {
      setInstalado(true);
      setEvento(null);
    };
    window.addEventListener("beforeinstallprompt", aoPedir);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPedir);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, []);

  if (instalado) return null;
  if (evento) {
    return (
      <button
        type="button"
        onClick={async () => {
          await evento.prompt();
          await evento.userChoice;
          setEvento(null);
        }}
        className="bg-fire glow inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-accent-foreground"
      >
        <Download className="size-4" /> Instalar app no celular
      </button>
    );
  }
  if (ios) {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground">
        Para instalar: toque em <Share className="size-3.5" /> e depois em “Adicionar à Tela de Início”
      </p>
    );
  }
  return null;
}
