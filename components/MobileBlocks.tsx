"use client";

import { useState } from "react";
import { ASSOCIATION_GRADIENT, ASSOCIATION_STOPS } from "@/lib/colors";
import { formatPercent } from "@/lib/formatters";
import { sectorName } from "@/lib/i18n";
import type { SearchResult } from "@/types/api";
import { useI18n } from "./LanguageProvider";

/* Blocos exclusivos do layout mobile (< 768px). Todos somem a partir de `md`. */

const BAR_COLOR = ASSOCIATION_STOPS[ASSOCIATION_STOPS.length - 1][1];
const EYEBROW = "text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-soft";

/** Estado inicial: temas sugeridos e referência discreta à base. */
export function MobileSuggestions({ onPick }: { onPick: (theme: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="-mt-0.5 md:hidden">
      <p className="text-xs text-ink-soft">{t.mobile.suggestionsLabel}</p>
      <ul className="mt-[0.4375rem] flex flex-wrap gap-1.5">
        {t.mobile.suggestions.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="rounded-full border border-line bg-surface px-[0.6875rem] py-1.5 text-[0.8125rem] leading-tight whitespace-nowrap text-ink transition-colors hover:border-assoc-max/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 flex items-center gap-1.5 text-xs whitespace-nowrap text-ink-soft">
        <span>EXAME Melhores e Maiores 2026</span>
        <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-ink-soft/60" />
        <span>{t.mobile.sourceCount}</span>
      </p>
    </div>
  );
}

/** Resultado: tema pesquisado, escopo e a pergunta ao modelo recolhida. */
export function MobileAnswer({ theme }: { theme: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <section aria-labelledby="resposta-titulo" className="md:hidden">
      <h2 id="resposta-titulo" className="font-serif text-[1.375rem] leading-[1.2] text-ink">
        {t.mobile.resultBefore}
        <span className="text-assoc-max">“{theme}”</span>
      </h2>
      <div className="m45:flex m45:items-baseline m45:gap-2.5">
        <p className="mt-1 text-xs text-ink-soft m45:whitespace-nowrap">{t.mobile.resultScope}</p>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-xs text-ink-soft underline decoration-ink-soft/45 underline-offset-2 m45:whitespace-nowrap"
        >
          {open ? t.mobile.hideQuestion : t.mobile.showQuestion} {open ? "▴" : "▾"}
        </button>
      </div>
      {open && (
        <p className="mt-2 text-[0.8125rem] leading-snug text-ink">
          {t.question.before}
          <strong className="font-semibold">“{theme}”</strong>
          {t.question.after}
        </p>
      )}
    </section>
  );
}

/** Top 5 em lista: nome inteiro, setor, % e barra. */
export function MobileRanking({ items, loading }: { items: SearchResult[]; loading: boolean }) {
  const { lang, t } = useI18n();
  return (
    <section
      aria-label={t.ranking.heading}
      aria-busy={loading}
      className="rounded-2xl border border-line bg-surface px-3.5 pt-3 pb-1.5 md:hidden m45:pt-2 m45:pb-0.5"
    >
      <ol className="transition-opacity duration-300" style={{ opacity: loading ? 0.55 : 1 }}>
        {items.map((r, i) => {
          const pct = Math.round(r.associationScore! * 100);
          return (
            <li
              key={r.id}
              className="flex items-center gap-[0.6875rem] border-t border-line py-[0.4375rem] first:border-t-0 first:pt-1 m45:py-[0.1875rem] m45:first:pt-0"
            >
              <span className="flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center rounded-full bg-assoc-min/80 text-[0.6875rem] text-ink-soft">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[0.9375rem] leading-[1.25] text-ink m45:leading-[1.15]">{r.company}</span>
                  <span className="shrink-0 text-[0.8125rem] leading-[1.25] font-semibold tabular-nums text-ink">
                    {formatPercent(r.associationScore!)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2.5 m45:mt-0">
                  <span className="min-w-0 flex-1 truncate text-[0.6875rem] leading-[1.3] text-ink-soft">
                    {sectorName(r.sector, lang)}
                  </span>
                  <span className="h-[5px] w-[5.25rem] shrink-0 overflow-hidden rounded-full bg-assoc-min/80">
                    <span
                      className="block h-full rounded-full transition-[width] duration-[600ms] ease-out"
                      style={{ width: `${pct}%`, backgroundColor: BAR_COLOR }}
                    />
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="border-t border-line pt-2 pb-1.5 text-xs text-ink-soft m45:hidden">
        {t.mobile.highlightedBelow} ↓
      </p>
    </section>
  );
}

/** Cabeçalho do mapa: dica no estado inicial; legenda e nota de ordenação com resultado. */
export function MobileMapHeading({ hasResult }: { hasResult: boolean }) {
  const { t } = useI18n();
  return (
    <div className="mb-2.5 md:hidden">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className={`${EYEBROW} whitespace-nowrap`}>{t.mobile.mapHeading}</h2>
        {hasResult ? (
          <span className="flex shrink-0 items-center gap-2 text-[0.6875rem] text-ink-soft">
            {t.mobile.legendLower}
            <span
              aria-hidden="true"
              className="h-1.5 w-[4.5rem] rounded-full"
              style={{ background: ASSOCIATION_GRADIENT }}
            />
            {t.mobile.legendHigher}
          </span>
        ) : (
          <span className="truncate text-[0.6875rem] text-ink-soft">{t.mobile.mapHint} ↓</span>
        )}
      </div>
      {hasResult && (
        <p className="mt-[3px] flex items-center gap-1 text-[0.6875rem] text-ink-soft">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h11M4 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {t.mobile.sortedNote}
        </p>
      )}
    </div>
  );
}
