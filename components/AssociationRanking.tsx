/** Máximo de itens: 8 no desktop e tablet, 6 no mobile (SPEC §14 e §18). */
const PLACEHOLDER_ROWS = 8;
const MOBILE_ROWS = 6;

/** Etapa 2 (estática): estrutura do ranking, ainda sem dados do Jev. */
export function AssociationRanking() {
  return (
    <section
      aria-labelledby="ranking-titulo"
      className="rounded-2xl border border-line bg-surface px-4 py-3.5 lg:p-6"
    >
      <h2
        id="ranking-titulo"
        className="text-xs font-semibold tracking-[0.14em] text-ink-soft"
      >
        MAIS ASSOCIADAS
      </h2>
      <div className="mt-2.5 border-t border-line pt-3 lg:mt-4">
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
      </div>
    </section>
  );
}
