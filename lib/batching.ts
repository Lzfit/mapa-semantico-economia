import { JevError, callJev } from "./jev";
import type { JevConfig, JevQuestion } from "./jev";

export interface BatchEntry {
  id: string;
  question: JevQuestion;
}

export interface BatchOptions {
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export interface EvaluateResult {
  scores: Record<string, number>;
  model: string;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function evaluateBatch(
  theme: string,
  entries: BatchEntry[],
  cfg: JevConfig,
  opts: Required<BatchOptions>,
): Promise<EvaluateResult> {
  const questions = Object.fromEntries(entries.map((e) => [e.id, e.question]));
  for (let attempt = 0; ; attempt++) {
    try {
      return await callJev(theme, questions, cfg);
    } catch (err) {
      if (!(err instanceof JevError)) throw err;

      // Divide apenas o batch que estourou o limite de tokens.
      if (err.kind === "max_tokens") {
        if (entries.length < 2) throw err;
        const mid = Math.ceil(entries.length / 2);
        const [a, b] = await Promise.all([
          evaluateBatch(theme, entries.slice(0, mid), cfg, opts),
          evaluateBatch(theme, entries.slice(mid), cfg, opts),
        ]);
        return { scores: { ...a.scores, ...b.scores }, model: a.model };
      }

      if (err.kind !== "retryable" || attempt >= opts.maxRetries) throw err;
      await opts.sleep(250 * 2 ** attempt + opts.random() * 200);
    }
  }
}

/**
 * Avalia todas as entradas em batches paralelos (padrão 4 × 250). Se qualquer
 * batch falhar após os retries, lança erro: nunca devolve mapa parcial.
 */
export async function evaluateAll(
  theme: string,
  entries: BatchEntry[],
  cfg: JevConfig,
  options: BatchOptions = {},
): Promise<EvaluateResult> {
  const opts: Required<BatchOptions> = {
    maxRetries: options.maxRetries ?? 2,
    sleep: options.sleep ?? defaultSleep,
    random: options.random ?? Math.random,
  };
  const results = await Promise.all(
    chunk(entries, cfg.batchSize).map((batch) => evaluateBatch(theme, batch, cfg, opts)),
  );

  const scores: Record<string, number> = {};
  for (const r of results) Object.assign(scores, r.scores);
  if (Object.keys(scores).length !== entries.length) {
    throw new JevError("fatal", "Quantidade de scores diferente da esperada.");
  }
  return { scores, model: results[0]?.model ?? cfg.model };
}
