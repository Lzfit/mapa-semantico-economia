import { evaluateAll } from "./batching";
import { buildCompanyContext, buildQuestion, questionId, readJevConfig } from "./jev";
import type { JevConfig } from "./jev";
import { buildModelQuestion } from "./question";
import type { BatchOptions } from "./batching";
import type { Evaluation } from "./searchCache";
import type { SearchResponse } from "@/types/api";
import type { Company } from "@/types/company";

/**
 * Avalia o tema contra as empresas divulgadas (999 na base 2026). A entidade não
 * divulgada nunca é enviada ao Jev e fica com score `null`.
 */
export async function evaluateTheme(
  theme: string,
  companies: Company[],
  cfg: JevConfig,
  options?: BatchOptions,
): Promise<Evaluation> {
  const entries = companies
    .filter((c) => !c.undisclosed)
    .map((c) => ({
      id: questionId(c.rank),
      question: buildQuestion(buildCompanyContext(c)),
    }));

  const { scores, model } = await evaluateAll(theme, entries, cfg, options);
  return {
    model,
    scores: companies.map((c) => (c.undisclosed ? null : scores[questionId(c.rank)])),
  };
}

export function buildSearchResponse(
  theme: string,
  companies: Company[],
  evaluation: Evaluation,
  meta: { cached: boolean; elapsedMs: number },
): SearchResponse {
  return {
    theme,
    question: buildModelQuestion(theme),
    cached: meta.cached,
    model: evaluation.model,
    elapsedMs: meta.elapsedMs,
    results: companies.map((c, i) => ({
      id: c.id,
      rank: c.rank,
      company: c.name,
      sector: c.sector,
      city: c.city,
      state: c.state,
      revenue2025ThousandsBRL: c.revenue2025ThousandsBRL,
      associationScore: evaluation.scores[i],
    })),
  };
}

/** Avaliação direta, sem cache nem proteções (usada em testes). */
export async function runSearch(
  theme: string,
  companies: Company[],
  cfg: JevConfig = readJevConfig(),
  options?: BatchOptions,
): Promise<SearchResponse> {
  const started = performance.now();
  const evaluation = await evaluateTheme(theme, companies, cfg, options);
  return buildSearchResponse(theme, companies, evaluation, {
    cached: false,
    elapsedMs: Math.round(performance.now() - started),
  });
}
