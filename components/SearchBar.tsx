"use client";

import { useI18n } from "./LanguageProvider";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  /** Mobile com resultado: barra mais baixa. */
  compact?: boolean;
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SearchBar({ value, onChange, onSubmit, loading, compact = false }: Props) {
  const { t } = useI18n();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className={`flex h-16 items-center gap-4 rounded-[18px] border border-assoc-max/35 bg-surface px-6 lg:h-12 short:h-[42px] tshort:h-[42px] tshort:gap-3 tshort:rounded-2xl tshort:px-5 lg:gap-3 lg:rounded-2xl lg:px-5 shadow-[0_0_0_4px_rgba(47,157,85,0.06)] focus-within:border-assoc-max/70 max-md:gap-3 max-md:pr-1.5 ${
        compact
          ? "max-md:h-[2.875rem] max-md:rounded-[0.875rem] max-md:pl-4"
          : "max-md:h-[3.375rem] max-md:rounded-2xl max-md:pl-[1.125rem]"
      }`}
    >
      <button
        type="submit"
        aria-label={t.search.submitLabel}
        disabled={loading}
        className={`text-ink-soft max-md:hidden ${loading ? "animate-pulse" : ""}`}
      >
        <SearchIcon className="lg:h-5 lg:w-5 tshort:h-5 tshort:w-5" />
      </button>
      <SearchIcon className="h-[1.25rem] w-[1.25rem] shrink-0 text-ink-soft md:hidden" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t.search.placeholder}
        aria-label={t.search.inputLabel}
        minLength={2}
        maxLength={80}
        className={`h-full min-w-0 flex-1 bg-transparent text-xl text-ink outline-none placeholder:text-ink-soft/70 sm:text-2xl lg:text-xl tshort:text-xl ${
          compact ? "max-md:text-[1.0625rem]!" : "max-md:text-[1.125rem]!"
        }`}
      />
      {/* Mobile: botão de ação visível, no lugar da lupa clicável. */}
      <button
        type="submit"
        aria-label={t.search.submitLabel}
        disabled={loading}
        className={`flex shrink-0 items-center justify-center bg-assoc-max text-white md:hidden ${
          compact ? "h-[2.125rem] w-[2.125rem] rounded-[0.625rem]" : "h-[2.625rem] w-[2.625rem] rounded-xl"
        } ${loading ? "animate-pulse" : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </form>
  );
}
