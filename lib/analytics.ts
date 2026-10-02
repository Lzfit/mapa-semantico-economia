import type { Lang } from "./i18n";

/** Google Analytics 4 (ID público). */
export const GA_MEASUREMENT_ID = "G-L7DMY152CK";

/** Categorias genéricas de erro de busca, derivadas só do status HTTP. */
export type SearchErrorCategory =
  | "invalid_input"
  | "rate_limited"
  | "unavailable"
  | "server_error"
  | "network";

/**
 * Únicos eventos e parâmetros enviados ao GA4. Nenhum carrega tema, query, empresas,
 * scores, ranking ou resposta da API: os tipos só admitem idioma e metadados genéricos.
 */
interface AnalyticsEvents {
  search_submitted: { ui_language: Lang };
  search_completed: { ui_language: Lang; success: true };
  search_error: {
    ui_language: Lang;
    success: false;
    error_category: SearchErrorCategory;
  };
  language_changed: { from_language: Lang; to_language: Lang };
}

export type AnalyticsEventName = keyof AnalyticsEvents;

const ALLOWED_PARAMS: {
  [K in AnalyticsEventName]: readonly (keyof AnalyticsEvents[K])[];
} = {
  search_submitted: ["ui_language"],
  search_completed: ["ui_language", "success"],
  search_error: ["ui_language", "success", "error_category"],
  language_changed: ["from_language", "to_language"],
};

type Gtag = (
  command: "event",
  name: string,
  params: Record<string, unknown>,
) => void;

/** Envia um evento ao GA4 copiando apenas os parâmetros permitidos; sem gtag, não faz nada. */
export function trackEvent<K extends AnalyticsEventName>(
  name: K,
  params: AnalyticsEvents[K],
): void {
  if (typeof window === "undefined") return;
  const gtag = (window as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  const safe: Record<string, unknown> = {};
  for (const key of ALLOWED_PARAMS[name]) safe[key as string] = params[key];
  try {
    gtag("event", name, safe);
  } catch {
    // Analytics nunca interfere na aplicação.
  }
}

export function searchErrorCategory(
  status: number | null,
): SearchErrorCategory {
  if (status === null) return "network";
  if (status === 400) return "invalid_input";
  if (status === 429) return "rate_limited";
  if (status === 503) return "unavailable";
  return "server_error";
}
