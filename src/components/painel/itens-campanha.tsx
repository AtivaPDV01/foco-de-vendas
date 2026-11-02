import { Sparkles } from "lucide-react";
import type { Campanha } from "@/lib/campanhas";

/** Faixa contínua com os produtos da campanha do mês. */
export function ItensCampanha({ campanha }: { campanha: Campanha }) {
  // A lista aparece duas vezes para o deslize ficar contínuo, sem emenda.
  const itens = [...campanha.itens, ...campanha.itens];
  return (
    <section aria-label={`Itens da campanha ${campanha.nome}`} className="surface relative overflow-hidden py-4 md:py-5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground md:px-6 md:text-xs md:tracking-[0.2em]">
        <Sparkles className="size-4 shrink-0 text-sun" /> Itens da campanha · <span className="text-fire">{campanha.nome}</span>
      </div>
      <div className="relative mt-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_96%,transparent)] md:mt-4">
        <ul className="animate-marquee flex w-max gap-3 px-2 md:gap-4">
          {itens.map((item, i) => (
            <li
              key={`${item.nome}-${i}`}
              aria-hidden={i >= campanha.itens.length}
              className="w-28 shrink-0 sm:w-36 md:w-52"
            >
              <div className="ring-fire flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,var(--color-secondary),var(--color-card)_70%)] p-2.5 md:p-4">
                <img
                  src={item.imagem}
                  alt={item.nome}
                  loading={i < 4 ? "eager" : "lazy"}
                  className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgb(0_0_0/0.45)]"
                />
              </div>
              <p className="mt-2 line-clamp-2 min-h-[2.5em] text-center font-display text-[11px] font-bold uppercase leading-tight md:mt-3 md:text-base">
                {item.nome}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
