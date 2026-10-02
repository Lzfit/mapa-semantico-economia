"use client";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function SearchBar({ value, onChange, onSubmit, loading }: Props) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex h-16 items-center gap-4 rounded-[18px] border border-assoc-max/35 bg-surface px-6 lg:h-12 lg:gap-3 lg:rounded-2xl lg:px-5 shadow-[0_0_0_4px_rgba(47,157,85,0.06)] focus-within:border-assoc-max/70"
    >
      <button
        type="submit"
        aria-label="Buscar"
        disabled={loading}
        className={`text-ink-soft ${loading ? "animate-pulse" : ""}`}
      >
        <svg className="lg:h-5 lg:w-5" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Explore um tema da economia brasileira"
        aria-label="Tema"
        minLength={2}
        maxLength={80}
        className="h-full min-w-0 flex-1 bg-transparent text-xl text-ink outline-none placeholder:text-ink-soft/70 sm:text-2xl lg:text-xl"
      />
    </form>
  );
}
