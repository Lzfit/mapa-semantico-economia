const PLACEHOLDER_ROWS = 8;

/** Etapa 2 (estática): estrutura do ranking, ainda sem dados do Jev. */
export function AssociationRanking() {
  return (
    <section
      aria-labelledby="ranking-titulo"
      className="rounded-2xl border border-line bg-surface p-6"
    >
      <h2
        id="ranking-titulo"
        className="text-xs font-semibold tracking-[0.14em] text-ink-soft"
      >
        MAIS ASSOCIADAS
      </h2>
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-4 text-sm text-ink-soft">
          As empresas mais associadas ao tema aparecerão aqui.
        </p>
        <ol className="flex flex-col gap-4" aria-hidden="true">
          {Array.from({ length: PLACEHOLDER_ROWS }, (_, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-assoc-min/70 text-xs text-ink-soft">
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
