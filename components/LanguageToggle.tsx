"use client";

import { Fragment } from "react";
import { trackEvent } from "@/lib/analytics";
import { LANG_NAMES, LANGS } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { useI18n } from "./LanguageProvider";

/** Seletor discreto PT | EN no header. */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  const change = (next: Lang) => {
    if (next === lang) return;
    setLang(next);
    trackEvent("language_changed", { from_language: lang, to_language: next });
  };
  return (
    <div
      role="group"
      aria-label={t.languageToggle.group}
      className="flex shrink-0 items-center gap-1.5 text-xs max-md:pt-1 md:pt-3 tracking-[0.08em] text-ink-soft lg:pt-2 short:pt-1.5 tshort:pt-1.5"
    >
      {LANGS.map((l, i) => (
        <Fragment key={l}>
          {i > 0 && (
            <span aria-hidden="true" className="text-ink-soft/40">
              |
            </span>
          )}
          <button
            type="button"
            lang={l}
            aria-label={LANG_NAMES[l]}
            aria-pressed={lang === l}
            onClick={() => change(l)}
            className={`rounded-sm px-0.5 outline-none transition-colors focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              lang === l ? "font-semibold text-ink" : "hover:text-ink"
            }`}
          >
            {l.toUpperCase()}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
