export function Header() {
  return (
    <header className="flex items-start justify-between gap-6">
      <div>
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-ink sm:text-[38px]">
          Mapa Semântico da Economia Brasileira
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-soft sm:text-base">
          Digite um tema e veja que partes da economia brasileira se acendem.
        </p>
      </div>
      <a
        href="#como-funciona"
        className="shrink-0 pt-2 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        Como funciona
      </a>
    </header>
  );
}
