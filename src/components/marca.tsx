import { Link } from "@tanstack/react-router";
import logo from "@/assets/ativa-pdv-logo.png.asset.json";
import { cn } from "@/lib/utils";
import { InstalarApp } from "@/components/instalar-app";

export function Marca({ className }: { className?: string }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Ativa PDV · início">
      <img src={logo.url} alt="Ativa PDV" className={cn("h-12 w-auto md:h-14", className)} />
    </Link>
  );
}

export function Rodape() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center md:px-8">
        <img src={logo.url} alt="Ativa PDV" className="h-16 w-auto md:h-20" />
        <InstalarApp />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Ativa PDV · Ranking de vendas
        </p>
      </div>
    </footer>
  );
}
