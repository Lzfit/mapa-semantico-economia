export function ModelQuestion({ theme }: { theme: string }) {
  return (
    <section aria-labelledby="pergunta-titulo" className="max-w-3xl">
      <h2
        id="pergunta-titulo"
        className="text-xs font-semibold tracking-[0.14em] text-ink-soft"
      >
        PERGUNTA AO MODELO
      </h2>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink">
        Quais das 1.000 maiores empresas do Brasil participam de forma
        economicamente relevante do mercado, da cadeia de valor ou do
        ecossistema relacionado a <strong className="font-semibold">“{theme}”</strong>?
      </p>
    </section>
  );
}
