import { ASSOCIATION_STOPS } from "@/lib/colors";
import { formatPercent } from "@/lib/formatters";
import type { SearchResult } from "@/types/api";

/** Máximo de itens: 8 no desktop e tablet, 6 no mobile (SPEC §14 e §18). */
const PLACEHOLDER_ROWS = 8;
const MOBILE_ROWS = 6;
const BAR_COLOR = ASSOCIATION_STOPS[ASSOCIATION_STOPS.length - 1][1];

interface Props {
  /** Já ordenado e limitado; `null` antes da primeira análise. */
  items: SearchResult[] | null;
  loading: boolean;
}

export function AssociationRanking({ items, loading }: Props) {
  return (
    <section
      aria-labelledby="ranking-titulo"
      aria-busy={loading}
      className="rounded-2xl border border-line bg-surface px-4 py-3.5 lg:px-5 lg:py-4 short:py-3"
    >
      <h2
        id="ranking-titulo"
        className="text-xs font-semibold tracking-[0.14em] text-ink-soft"
      >
        MAIS ASSOCIADAS
      </h2>
      <div className="mt-2.5 border-t border-line pt-3 lg:mt-3 lg:pt-3.5 short:mt-2 short:pt-2.5">
        {items ? (
          <ol
            className="grid grid-cols-2 gap-x-6 gap-y-3 transition-opacity duration-300 lg:flex lg:flex-col lg:gap-3 short:gap-2"
            style={{ opacity: loading ? 0.55 : 1 }}
          >
            {items.map((r, i) => {
              const pct = Math.round(r.associationScore! * 100);
              return (
                <li key={i} className="flex min-w-0 items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-assoc-min/70 text-xs text-ink-soft lg:h-7 lg:w-7">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm text-ink">
                      <span className="truncate">{r.company}</span>
                      <span className="shrink-0 text-xs text-ink-soft">
                        {formatPercent(r.associationScore!)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-assoc-min/70">
                      <div
                        className="h-full rounded-full transition-[width] duration-[600ms] ease-out"
                        style={{ width: `${pct}%`, backgroundColor: BAR_COLOR }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <>
            <p className="mb-4 hidden text-sm text-ink-soft lg:block">
              As empresas mais associadas ao tema aparecerão aqui.
            </p>
            <ol
              className="grid grid-cols-2 gap-x-6 gap-y-3 lg:flex lg:flex-col lg:gap-4"
              aria-hidden="true"
            >
              {Array.from({ length: PLACEHOLDER_ROWS }, (_, i) => (
                <li
                  key={i}
                  className={`items-center gap-3 ${i >= MOBILE_ROWS ? "hidden md:flex" : "flex"}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-assoc-min/70 text-xs text-ink-soft lg:h-7 lg:w-7">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="h-2 w-2/5 rounded-full bg-assoc-min/80" />
                    <div className="mt-2 h-1.5 rounded-full bg-assoc-min/60" />
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
