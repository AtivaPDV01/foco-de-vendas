import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";

export function Marca() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <span className="bg-fire glow flex size-10 items-center justify-center rounded-xl text-accent-foreground">
        <Flame className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-base font-extrabold tracking-tight">Ativa PDV</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Ranking de vendas
        </span>
      </span>
    </Link>
  );
}
