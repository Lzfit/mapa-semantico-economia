import { StoreUnavailableError } from "./store";
import type { Store } from "./store";

export class RateLimitedError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("rate_limited");
  }
}

export class BusyError extends Error {
  readonly retryAfterSeconds = 3;
  constructor() {
    super("busy");
  }
}

const WINDOW_MS = 60_000;

/** Janela fixa de 1 minuto por bucket e IP (já com hash). Lança `RateLimitedError` ao exceder. */
export async function enforceRateLimit(
  store: Store,
  bucket: string,
  ipHash: string,
  limit: number,
  now: number,
): Promise<void> {
  const window = Math.floor(now / WINDOW_MS);
  let count: number;
  try {
    count = await store.incr(`jev-search:rl:${bucket}:${ipHash}:${window}`, 70);
  } catch (err) {
    throw new StoreUnavailableError(err);
  }
  if (count > limit) {
    const retry = Math.max(1, Math.ceil(((window + 1) * WINDOW_MS - now) / 1000));
    throw new RateLimitedError(retry);
  }
}

const SLOTS_KEY = "jev-search:slots";
/** Maior que o `maxDuration` da rota (60s): o lease só vence se a instância morrer. */
export const SLOT_LEASE_SECONDS = 90;

/**
 * Teto global de buscas simultâneas chegando ao Jev, com lease por slot: se a
 * instância morrer no meio da busca, o lease vence sozinho. O slot é liberado em
 * `finally`, inclusive quando a busca falha.
 */
export async function withConcurrencySlot<T>(
  store: Store,
  max: number,
  now: () => number,
  fn: () => Promise<T>,
): Promise<T> {
  const token = `${now()}-${Math.random().toString(36).slice(2)}`;
  let acquired: boolean;
  try {
    acquired = await store.acquireLease(SLOTS_KEY, token, max, SLOT_LEASE_SECONDS, now());
  } catch (err) {
    throw new StoreUnavailableError(err);
  }
  if (!acquired) throw new BusyError();
  try {
    return await fn();
  } finally {
    await store.releaseLease(SLOTS_KEY, token).catch(() => {});
  }
}
