import type { Company } from "@/types/company";

/** Muda ao alterar prompt, contexto ou base: invalida todo o cache anterior. */
export const CACHE_VERSION = "v1";
export const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Chave de cache: trim, espaços consecutivos → um, minúsculas (e NFC). Sem
 * stemming, tradução nem remoção de acentos. O texto original só é exibido.
 */
export function normalizeThemeKey(theme: string): string {
  return theme.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();
}

export const cacheKeyFor = (theme: string) => `jev-search:${CACHE_VERSION}:${normalizeThemeKey(theme)}`;
export const lockKeyFor = (theme: string) => `jev-search:lock:${CACHE_VERSION}:${normalizeThemeKey(theme)}`;

export interface Evaluation {
  /** Score por posição (índice = rank − 1); `null` na entidade não divulgada. */
  scores: Array<number | null>;
  model: string;
}

export function encodeEvaluation(e: Evaluation): string {
  return JSON.stringify({ v: 1, model: e.model, scores: e.scores });
}

/** Só aceita resultado completo e válido; qualquer outra coisa conta como miss. */
export function decodeEvaluation(raw: string | null, companies: Company[]): Evaluation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { v?: number; model?: unknown; scores?: unknown };
    if (parsed.v !== 1 || typeof parsed.model !== "string" || !Array.isArray(parsed.scores)) return null;
    if (parsed.scores.length !== companies.length) return null;
    for (let i = 0; i < companies.length; i++) {
      const s = parsed.scores[i];
      if (companies[i].undisclosed) {
        if (s !== null) return null;
      } else if (typeof s !== "number" || !Number.isFinite(s) || s < 0 || s > 1) return null;
    }
    return { model: parsed.model, scores: parsed.scores as Array<number | null> };
  } catch {
    return null;
  }
}

