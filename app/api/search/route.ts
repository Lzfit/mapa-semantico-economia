import { loadCompanies } from "@/lib/companies";
import { cleanTheme, isValidTheme } from "@/lib/normalizeTheme";
import { runSearch } from "@/lib/search";
import type { SearchErrorResponse } from "@/types/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRIENDLY_ERROR = "Não foi possível concluir esta análise. Tente novamente.";

const fail = (error: string, status: number) =>
  Response.json({ error } satisfies SearchErrorResponse, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { theme?: unknown } | null;
  const theme = typeof body?.theme === "string" ? cleanTheme(body.theme) : "";
  if (!isValidTheme(theme)) {
    return fail("Digite um tema com 2 a 80 caracteres.", 400);
  }

  try {
    const result = await runSearch(theme, loadCompanies());
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Detalhes internos ficam só no log do servidor.
    console.error("search_failed", err instanceof Error ? err.message : "erro desconhecido");
    return fail(FRIENDLY_ERROR, 502);
  }
}
