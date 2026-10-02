import { createHash } from "node:crypto";
import { loadCompanies } from "@/lib/companies";
import { readJevConfig } from "@/lib/jev";
import { cleanTheme, isValidTheme } from "@/lib/normalizeTheme";
import {
  BusyError,
  RateLimitedError,
  SearchUnavailableError,
  handleSearch,
  readLimits,
} from "@/lib/searchService";
import { getStore } from "@/lib/store";
import type { SearchErrorResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FRIENDLY_ERROR = "Não foi possível concluir esta análise. Tente novamente.";
const MAX_BODY_CHARS = 1024;

const fail = (error: string, status: number, headers: Record<string, string> = {}) =>
  Response.json({ error } satisfies SearchErrorResponse, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

/** IP do cliente (a Vercel define esses cabeçalhos); só o hash entra nas chaves do Redis. */
function clientIpHash(request: Request): string {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown";
  return createHash("sha256").update(ip.trim()).digest("hex").slice(0, 24);
}

export async function POST(request: Request) {
  // Só `theme` é lido do corpo; nada mais influencia endpoint, modelo ou chave.
  const text = await request.text().catch(() => "");
  const body = (text.length <= MAX_BODY_CHARS ? safeJson(text) : null) as { theme?: unknown } | null;
  const theme = typeof body?.theme === "string" ? cleanTheme(body.theme) : "";
  if (!isValidTheme(theme)) {
    return fail("Digite um tema com 2 a 80 caracteres.", 400);
  }

  try {
    const result = await handleSearch(theme, clientIpHash(request), {
      store: getStore(),
      companies: loadCompanies(),
      getConfig: readJevConfig,
      limits: readLimits(),
      log: (message) => console.error(message),
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof RateLimitedError) {
      return fail(
        "Muitas buscas em pouco tempo. Aguarde um instante e tente novamente.",
        429,
        { "Retry-After": String(err.retryAfterSeconds) },
      );
    }
    if (err instanceof BusyError) {
      return fail(
        "Estamos com muitas análises em andamento. Tente novamente em instantes.",
        503,
        { "Retry-After": String(err.retryAfterSeconds) },
      );
    }
    // Detalhes internos ficam só no log do servidor.
    console.error(
      "search_failed",
      err instanceof SearchUnavailableError || err instanceof Error ? err.message : "erro desconhecido",
    );
    return fail(FRIENDLY_ERROR, 502);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
