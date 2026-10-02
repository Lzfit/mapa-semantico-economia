"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, MESSAGES, urlForLang } from "@/lib/i18n";
import type { Lang, Messages } from "@/lib/i18n";

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageState>({ lang: DEFAULT_LANG, setLang: () => {} });

/** Idioma vem da URL (`?lang=en`); trocar atualiza a URL sem recarregar e sem persistência local. */
export function LanguageProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = MESSAGES[lang].htmlLang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.history.replaceState(null, "", urlForLang(window.location.href, next));
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageState & { t: Messages } {
  const state = useContext(LanguageContext);
  return { ...state, t: MESSAGES[state.lang] };
}
