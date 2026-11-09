import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ultimaSincronizacaoQuery } from "@/lib/painel.functions";
import { cn } from "@/lib/utils";

/** Abas no topo: visão do mês e visão do dia. */
export function AbasPainel({ ativa }: { ativa: "mes" | "dia" | "extrato" | "loja" }) {
  const base = "rounded-full px-4 py-2 text-sm font-bold transition-colors sm:px-5";
  return (
    <nav aria-label="Visão do painel" className="inline-flex flex-wrap rounded-full border border-border bg-card/70 p-1">
      <Link to="/" className={cn(base, ativa === "mes" ? "bg-fire text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
        Mês
      </Link>
      <Link to="/dia" className={cn(base, ativa === "dia" ? "bg-fire text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
        Dia
      </Link>
      <Link to="/extrato" className={cn(base, ativa === "extrato" ? "bg-fire text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
        Meu extrato
      </Link>
      <Link to="/loja" className={cn(base, ativa === "loja" ? "bg-fire text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
        Minha loja
      </Link>
    </nav>
  );
}

function haQuanto(iso: string, agora: number) {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h} h`;
}

/** Selo "Ao vivo" com o horário da última leitura do Mercaflow. */
export function SeloSincronizacao() {
  const { data } = useQuery(ultimaSincronizacaoQuery());
  const [agora, setAgora] = useState<number | null>(null);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!data || agora === null) return null;
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(data));
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-sun" />
      </span>
      <span className="font-bold uppercase tracking-wider text-foreground">Ao vivo</span>
      Sincronizado às {hora} ({haQuanto(data, agora)})
    </p>
  );
}
