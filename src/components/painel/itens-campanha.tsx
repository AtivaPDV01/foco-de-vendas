import { Sparkles } from "lucide-react";
import type { Campanha } from "@/lib/campanhas";

/** Faixa contínua com os produtos da campanha do mês. */
export function ItensCampanha({ campanha }: { campanha: Campanha }) {
  // A lista aparece duas vezes para o deslize ficar contínuo, sem emenda.
  const itens = [...campanha.itens, ...campanha.itens];
  return (
    <section aria-label={`Itens da campanha ${campanha.nome}`} className="surface relative overflow-hidden py-5">
      <div className="flex items-center gap-2 px-6 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        <Sparkles className="size-4 text-sun" /> Itens da campanha · <span className="text-fire">{campanha.nome}</span>
      </div>
      <div className="relative mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
        <ul className="animate-marquee flex w-max gap-4 px-2">
          {itens.map((item, i) => (
            <li
              key={`${item.nome}-${i}`}
              aria-hidden={i >= campanha.itens.length}
              className="w-40 shrink-0 md:w-52"
            >
              <div className="ring-fire flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,var(--color-secondary),var(--color-card)_70%)] p-4">
                <img
                  src={item.imagem}
                  alt={item.nome}
                  loading={i < 4 ? "eager" : "lazy"}
                  className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgb(0_0_0/0.45)]"
                />
              </div>
              <p className="mt-3 text-center font-display text-sm font-bold uppercase leading-tight md:text-base">
                {item.nome}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
