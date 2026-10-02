export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Receita-fonte em milhares de reais → "R$ 497,5 bi" (só apresentação). */
export function formatRevenueBi(thousandsBRL: number): string {
  const bi = thousandsBRL / 1_000_000;
  return `R$ ${bi.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`;
}
