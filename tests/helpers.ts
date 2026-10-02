import type { JevConfig } from "@/lib/jev";

export function mockConfig(fetchImpl: typeof fetch, overrides: Partial<JevConfig> = {}): JevConfig {
  return {
    apiKey: "chave-de-teste-secreta",
    model: "jev-latest",
    batchSize: 250,
    endpoint: "https://jev.test/v1/systemone",
    timeoutMs: 1000,
    fetchImpl,
    ...overrides,
  };
}

export interface Call {
  ids: string[];
  body: { model: string; state: { tema: string }; questions: Record<string, unknown> };
  headers: Record<string, string>;
}

/** Score determinístico só para testes. */
export const fakeScore = (id: string) => (parseInt(id.slice(1), 10) % 100) / 100;

export function okResponse(ids: string[]): Response {
  const answers = Object.fromEntries(ids.map((id) => [id, { noul: fakeScore(id) }]));
  return Response.json({
    answers,
    usage: { input_tokens: 1, output_tokens: 1 },
    model: "jev-test",
  });
}

export const maxTokensResponse = () =>
  Response.json({ detail: { error_type: "max_tokens_exceeded" } }, { status: 400 });

export const noSleep = async () => {};
