import { useEffect, useRef, useState } from "react";
import { Package, Sparkles } from "lucide-react";
import type { Campanha } from "@/lib/painel.functions";
import { cn } from "@/lib/utils";

type Item = Campanha["itens"][number];

function Cartao({ item, eager }: { item: Item; eager: boolean }) {
  return (
    <>
      <div className="ring-fire flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,var(--color-secondary),var(--color-card)_70%)] p-2.5 md:p-4">
        {item.imagem ? (
          <img
            src={item.imagem}
            alt={item.nome}
            loading={eager ? "eager" : "lazy"}
            className="h-full w-full object-contain drop-shadow-[0_10px_18px_rgb(0_0_0/0.45)]"
          />
        ) : (
          <Package className="size-1/3 text-muted-foreground" aria-hidden />
        )}
      </div>
      <p className="mt-2 line-clamp-2 min-h-[2.5em] text-center font-display text-[11px] font-bold uppercase leading-tight md:mt-3 md:text-base">
        {item.nome}
      </p>
    </>
  );
}

/** Faixa com os produtos da campanha: deslize com o dedo no celular, faixa contínua no computador. */
export function ItensCampanha({ campanha }: { campanha: Campanha }) {
  const itens = [...campanha.itens, ...campanha.itens];
  const trilho = useRef<HTMLUListElement>(null);
  const [ativo, setAtivo] = useState(0);

  const passo = () => {
    const el = trilho.current;
    const primeiro = el?.children[0] as HTMLElement | undefined;
    return primeiro ? primeiro.offsetWidth + 12 : 1;
  };
  const aoRolar = () => {
    const el = trilho.current;
    if (!el) return;
    const fim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setAtivo(fim ? campanha.itens.length - 1 : Math.round(el.scrollLeft / passo()));
  };
  const irPara = (i: number) => trilho.current?.scrollTo({ left: i * passo(), behavior: "smooth" });

  // Avança sozinho; pausa enquanto o dedo está na tela e por alguns segundos depois.
  const tocando = useRef(false);
  const ultimoToque = useRef(0);
  const marcarToque = () => {
    ultimoToque.current = Date.now();
  };
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      const el = trilho.current;
      if (!el || el.offsetParent === null) return; // escondido (computador)
      if (tocando.current || Date.now() - ultimoToque.current < 3500) return;
      const fim = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      const atual = Math.round(el.scrollLeft / passo());
      irPara(fim ? 0 : atual + 1);
    }, 2500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section aria-label={`Itens da campanha ${campanha.nome}`} className="surface relative overflow-hidden py-4 md:py-5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground md:px-6 md:text-xs md:tracking-[0.2em]">
        <Sparkles className="size-4 shrink-0 text-sun" /> Itens da campanha · <span className="text-fire">{campanha.nome}</span>
      </div>

      {/* Celular: deslizar com o dedo + indicadores */}
      <div className="md:hidden">
        <ul
          ref={trilho}
          onScroll={aoRolar}
          onTouchStart={() => {
            tocando.current = true;
            marcarToque();
          }}
          onTouchEnd={() => {
            tocando.current = false;
            marcarToque();
          }}
          onTouchCancel={() => {
            tocando.current = false;
            marcarToque();
          }}
          className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {campanha.itens.map((item, i) => (
            <li key={item.id} className="w-[38%] shrink-0 snap-start">
              <Cartao item={item} eager={i < 3} />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Posição no carrossel">
          {campanha.itens.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={ativo === i}
              aria-label={`Ir para ${item.nome}`}
              onClick={() => {
                marcarToque();
                irPara(i);
              }}
              className={cn(
                "h-2 rounded-full transition-all",
                ativo === i ? "bg-fire w-6" : "w-2 bg-muted-foreground/40",
              )}
            />
          ))}
        </div>
      </div>

      {/* Computador: faixa contínua */}
      <div className="relative mt-4 hidden overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_4%,#000_96%,transparent)] md:block">
        <ul className="animate-marquee flex w-max gap-4 px-2">
          {itens.map((item, i) => (
            <li key={`${item.id}-${i}`} aria-hidden={i >= campanha.itens.length} className="w-52 shrink-0">
              <Cartao item={item} eager={i < 4} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
