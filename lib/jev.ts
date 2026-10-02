import type { Company } from "@/types/company";

export const DEFAULT_JEV_ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export interface JevQuestion {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
}

export type JevErrorKind = "max_tokens" | "retryable" | "fatal";

/** Mensagens daqui nunca incluem corpo de resposta nem credenciais. */
export class JevError extends Error {
  constructor(
    public readonly kind: JevErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "JevError";
  }
}

export interface JevConfig {
  apiKey: string;
  model: string;
  batchSize: number;
  endpoint: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/** Lê a configuração somente no servidor. */
export function readJevConfig(env: NodeJS.ProcessEnv = process.env): JevConfig {
  const apiKey = env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) throw new JevError("fatal", "TYPESAFE_API_KEY não configurada.");
  const size = Number(env.JEV_BATCH_SIZE);
  return {
    apiKey,
    model: env.JEV_MODEL?.trim() || "jev-latest",
    batchSize: Number.isInteger(size) && size > 0 ? size : 250,
    endpoint: env.JEV_API_URL?.trim() || DEFAULT_JEV_ENDPOINT,
    timeoutMs: 15_000,
  };
}

/** Contexto mínimo de desambiguação, só com dados da EXAME (SPEC §20). */
export function buildCompanyContext(company: Company): string {
  const place = [company.city, company.state].filter(Boolean).join(", ");
  return (
    `${company.name} — empresa atuante no Brasil no setor ${company.sector}` +
    (place ? `, sediada em ${place}` : "")
  );
}

const CRITERIA_TRUE =
  "A empresa possui relação empresarial específica e relevante com o tema por produtos, serviços, infraestrutura, insumos, tecnologia, distribuição ou participação direta em sua cadeia de valor.";
const CRITERIA_FALSE =
  "A empresa é apenas usuária, cliente ou beneficiária genérica do tema, ou sua relação é incidental, remota ou comum à maioria das grandes empresas.";

/** Prompt validado (SPEC §22). */
export function buildQuestion(companyContext: string): JevQuestion {
  return {
    type: "noul",
    instructions:
      `Um analista de mercado incluiria a empresa "${companyContext}" ` +
      "entre as empresas que participam de forma economicamente relevante " +
      "do mercado, cadeia de valor ou ecossistema relacionado ao tema " +
      "descrito no state?",
    criteria: { true: CRITERIA_TRUE, false: CRITERIA_FALSE },
  };
}

/** `e0001` … `e1000`, conforme `posicao_receita`. */
export function questionId(rank: number): string {
  return `e${String(rank).padStart(4, "0")}`;
}

export interface JevBatchResult {
  scores: Record<string, number>;
  model: string;
}

/** Uma chamada ao Jev para um conjunto de perguntas. */
export async function callJev(
  theme: string,
  questions: Record<string, JevQuestion>,
  cfg: JevConfig,
): Promise<JevBatchResult> {
  const doFetch = cfg.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(cfg.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: cfg.model, state: { tema: theme }, questions }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
      cache: "no-store",
    });
  } catch {
    throw new JevError("retryable", "Falha de rede ou timeout ao consultar o Jev.");
  }

  if (!res.ok) {
    if (res.status === 400) {
      const body = (await res.json().catch(() => null)) as {
        detail?: { error_type?: string };
      } | null;
      if (body?.detail?.error_type === "max_tokens_exceeded") {
        throw new JevError("max_tokens", "Batch acima do limite de tokens.");
      }
    }
    if (res.status === 429 || res.status >= 500) {
      throw new JevError("retryable", `Jev respondeu HTTP ${res.status}.`);
    }
    throw new JevError("fatal", `Jev respondeu HTTP ${res.status}.`);
  }

  const body = (await res.json().catch(() => null)) as {
    answers?: Record<string, { noul?: unknown }>;
    model?: unknown;
  } | null;
  if (!body?.answers || typeof body.answers !== "object") {
    throw new JevError("fatal", "Resposta do Jev sem `answers`.");
  }

  const scores: Record<string, number> = {};
  for (const id of Object.keys(questions)) {
    const value = body.answers[id]?.noul;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
      throw new JevError("fatal", `Score inválido para ${id}.`);
    }
    scores[id] = value;
  }
  return { scores, model: typeof body.model === "string" ? body.model : cfg.model };
}
