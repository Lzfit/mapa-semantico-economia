import { evaluateAll } from "./batching";
import { buildCompanyContext, buildQuestion, questionId, readJevConfig } from "./jev";
import type { JevConfig } from "./jev";
import { buildModelQuestion } from "./question";
import type { BatchOptions } from "./batching";
import type { SearchResponse } from "@/types/api";
import type { Company } from "@/types/company";

/**
 * Avalia o tema contra as empresas divulgadas (999 na base 2026) e devolve as
 * 1.000 células; a entidade não divulgada nunca é enviada ao Jev.
 */
export async function runSearch(
  theme: string,
  companies: Company[],
  cfg: JevConfig = readJevConfig(),
  options?: BatchOptions,
): Promise<SearchResponse> {
  const started = performance.now();
  const entries = companies
    .filter((c) => !c.undisclosed)
    .map((c) => ({
      id: questionId(c.rank),
      question: buildQuestion(buildCompanyContext(c)),
    }));

  const { scores, model } = await evaluateAll(theme, entries, cfg, options);

  return {
    theme,
    question: buildModelQuestion(theme),
    cached: false,
    model,
    elapsedMs: Math.round(performance.now() - started),
    results: companies.map((c) => ({
      id: c.id,
      rank: c.rank,
      company: c.name,
      sector: c.sector,
      city: c.city,
      state: c.state,
      revenue2025ThousandsBRL: c.revenue2025ThousandsBRL,
      associationScore: c.undisclosed ? null : scores[questionId(c.rank)],
    })),
  };
}
