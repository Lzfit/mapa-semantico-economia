import type { Lang } from "./i18n";

export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Receita-fonte em milhares de reais → "R$ 497,5 bi" (só apresentação). */
export function formatRevenueBi(thousandsBRL: number): string {
  const bi = thousandsBRL / 1_000_000;
  return `R$ ${bi.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`;
}

/** Receita em reais (sem conversão de moeda): PT "R$ 497,5 bi", EN "R$ 497.5B". */
export function formatRevenue(thousandsBRL: number, lang: Lang): string {
  if (lang === "pt") return formatRevenueBi(thousandsBRL);
  const bi = thousandsBRL / 1_000_000;
  return `R$ ${bi.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
}
