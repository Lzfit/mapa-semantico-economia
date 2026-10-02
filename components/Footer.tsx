"use client";

import { useI18n } from "./LanguageProvider";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="text-xs text-ink-soft">
      {t.footer.source}: EXAME Melhores e Maiores 2026 • {t.footer.association}: Jev / TypeSafe
    </footer>
  );
}
