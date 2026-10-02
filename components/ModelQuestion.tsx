"use client";

import { useI18n } from "./LanguageProvider";

/** O tema aparece como o usuário digitou: nunca é traduzido. */
export function ModelQuestion({ theme }: { theme: string }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby="pergunta-titulo" className="max-w-3xl lg:max-w-none">
      <h2
        id="pergunta-titulo"
        className="text-xs font-semibold tracking-[0.14em] text-ink-soft tshort:sr-only"
      >
        {t.question.heading}
      </h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink lg:mt-0.5 lg:text-[13.5px] lg:leading-snug tshort:mt-0.5 tshort:text-[13.5px] tshort:leading-tight">
        {t.question.before}
        <strong className="font-semibold">“{theme}”</strong>
        {t.question.after}
      </p>
    </section>
  );
}
