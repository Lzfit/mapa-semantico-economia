export interface SearchRequest {
  theme: string;
}

export interface SearchResult {
  id: string;
  rank: number;
  company: string;
  sector: string;
  city: string | null;
  state: string | null;
  revenue2025ThousandsBRL: number | null;
  /** 0–1; `null` quando a empresa não é avaliada (entidade não divulgada). */
  associationScore: number | null;
}

export interface SearchResponse {
  theme: string;
  question: string;
  cached: boolean;
  model: string;
  elapsedMs: number;
  /** Ordenado pela posição original da EXAME. */
  results: SearchResult[];
}

export interface SearchErrorResponse {
  error: string;
}
