interface Props {
  /** Com resultado na tela, o subtítulo recolhe no desktop. */
  hasResult?: boolean;
}

export function Header({ hasResult = false }: Props) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div>
        <h1 className="font-serif text-[28px] leading-tight tracking-tight text-ink sm:text-[38px] lg:text-[30px] short:text-[26px]">
          Mapa Semântico da Economia Brasileira
        </h1>
        <div
          className={`grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-500 ease-out ${
            hasResult ? "lg:grid-rows-[0fr] lg:opacity-0" : ""
          }`}
        >
          <p className="min-h-0 overflow-hidden text-[15px] text-ink-soft sm:text-base">
            <span className="block pt-1.5">
              Digite um tema e veja que partes da economia brasileira se acendem.
            </span>
          </p>
        </div>
      </div>
      <a
        href="#como-funciona"
        className="shrink-0 pt-2 text-sm text-ink-soft transition-colors hover:text-ink lg:pt-1.5"
      >
        Como funciona
      </a>
    </header>
  );
}
