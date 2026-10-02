import type { SearchResult } from "@/types/api";

/** Top N por score decrescente; empate: melhor posição de receita. Ignora quem não tem score. */
export function topAssociated(results: SearchResult[], limit: number): SearchResult[] {
  return results
    .filter((r) => r.associationScore !== null)
    .sort((a, b) => b.associationScore! - a.associationScore! || a.rank - b.rank)
    .slice(0, limit);
}
