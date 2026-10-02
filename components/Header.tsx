"use client";

import { useI18n } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";

interface Props {
  /** Com resultado na tela, o subtítulo recolhe no desktop. */
  hasResult?: boolean;
}

/** Marca: três barras verticais crescentes (símbolo do canto superior esquerdo da referência). */
export function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-[1.25em] shrink-0 items-center text-[28px] leading-tight sm:text-[38px] lg:text-[30px] short:text-[26px] tshort:text-[26px]"
    >
      <svg viewBox="0 0 28 30" className="h-[0.72em] w-auto" focusable="false">
        <rect x="0" y="16.5" width="6.5" height="13.5" rx="3.25" fill="#6fcb94" />
        <rect x="10.75" y="8.5" width="6.5" height="21.5" rx="3.25" fill="#46b36f" />
        <rect x="21.5" y="0" width="6.5" height="30" rx="3.25" fill="#2a9450" />
      </svg>
    </span>
  );
}

export function Header({ hasResult = false }: Props) {
  const { t } = useI18n();
  return (
    <header className="relative flex items-start gap-3 lg:gap-2.5">
      <BrandMark />
      <div className="min-w-0 flex-1">
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-ink sm:text-[38px] lg:text-[30px] short:text-[26px] tshort:text-[26px]">
          {t.title}
        </h1>
        <div
          className={`grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-500 ease-out ${
            hasResult ? "lg:grid-rows-[0fr] lg:opacity-0 tshort:grid-rows-[0fr] tshort:opacity-0" : ""
          }`}
        >
          <p className="min-h-0 overflow-hidden text-[15px] text-ink-soft sm:text-base">
            <span className="block pt-1.5">
              {t.subtitle}
            </span>
          </p>
        </div>
      </div>
      <LanguageToggle />
    </header>
  );
}
