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
  const count = await store.incr(`jev-search:rl:${bucket}:${ipHash}:${window}`, 70);
  if (count > limit) {
    const retry = Math.max(1, Math.ceil(((window + 1) * WINDOW_MS - now) / 1000));
    throw new RateLimitedError(retry);
  }
}

const INFLIGHT_KEY = "jev-search:inflight";

/** Teto global de buscas simultâneas chegando ao Jev (cada uma usa 4 requests paralelos). */
export async function withInflightSlot<T>(
  store: Store,
  max: number,
  fn: () => Promise<T>,
): Promise<T> {
  const count = await store.incr(INFLIGHT_KEY, 120);
  if (count > max) {
    await store.decr(INFLIGHT_KEY);
    throw new BusyError();
  }
  try {
    return await fn();
  } finally {
    await store.decr(INFLIGHT_KEY).catch(() => {});
  }
}
