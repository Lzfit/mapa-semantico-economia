import { BusyError, RateLimitedError, enforceRateLimit, withInflightSlot } from "./rateLimit";
import { buildSearchResponse, evaluateTheme } from "./search";
import {
  CACHE_TTL_SECONDS,
  cacheKeyFor,
  decodeEvaluation,
  encodeEvaluation,
  lockKeyFor,
} from "./searchCache";
import type { Evaluation } from "./searchCache";
import type { BatchOptions } from "./batching";
import type { JevConfig } from "./jev";
import type { Store } from "./store";
import type { SearchResponse } from "@/types/api";
import type { Company } from "@/types/company";

export { BusyError, RateLimitedError };

/** Falha de uma análise que outra requisição estava calculando. */
export class SearchUnavailableError extends Error {}

export interface Limits {
  /** Buscas novas (que chegam ao Jev) por IP por minuto. */
  newPerMinute: number;
  /** Todas as buscas, inclusive servidas por cache, por IP por minuto. */
  allPerMinute: number;
  /** Buscas simultâneas chegando ao Jev em toda a aplicação. */
  maxConcurrent: number;
}

const int = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

export function readLimits(env: NodeJS.ProcessEnv = process.env): Limits {
  return {
    newPerMinute: int(env.SEARCH_RATE_LIMIT_NEW_PER_MIN, 10),
    allPerMinute: int(env.SEARCH_RATE_LIMIT_ALL_PER_MIN, 120),
    // 16 buscas × 4 batches = 64 requests: o que o stress test do Jev validou.
    maxConcurrent: int(env.JEV_MAX_CONCURRENT_SEARCHES, 16),
  };
}

export interface SearchDeps {
  store: Store;
  companies: Company[];
  /** Lazy: só é lido quando a busca realmente vai ao Jev. */
  getConfig: () => JevConfig;
  limits: Limits;
  evaluate?: typeof evaluateTheme;
  batchOptions?: BatchOptions;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
}

const LOCK_TTL_SECONDS = 60;
const POLL_MS = 250;
const MAX_WAIT_MS = 45_000;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Busca com normalização, cache de 7 dias, deduplicação distribuída (lock SET NX
 * + espera pelo cache), rate limit por IP e teto global de concorrência.
 * Só resultados completos e válidos entram no cache; falhas nunca.
 */
export async function handleSearch(
  theme: string,
  ipHash: string,
  deps: SearchDeps,
): Promise<SearchResponse> {
  const { store, companies, limits } = deps;
  const now = deps.now ?? Date.now;
  const sleep = deps.sleep ?? defaultSleep;
  const log = deps.log ?? (() => {});
  const evaluate = deps.evaluate ?? evaluateTheme;
  const started = now();
  const respond = (e: Evaluation, cached: boolean) =>
    buildSearchResponse(theme, companies, e, { cached, elapsedMs: now() - started });

  const cacheKey = cacheKeyFor(theme);
  const lockKey = lockKeyFor(theme);

  await enforceRateLimit(store, "all", ipHash, limits.allPerMinute, now());

  const readCache = async () => {
    try {
      return decodeEvaluation(await store.get(cacheKey), companies);
    } catch {
      log("cache_read_failed");
      return null;
    }
  };

  let waited = false;
  for (;;) {
    const cached = await readCache();
    if (cached) return respond(cached, true);

    const token = `${now()}-${Math.random().toString(36).slice(2)}`;
    if (await store.setNx(lockKey, token, LOCK_TTL_SECONDS)) {
      try {
        // Outra instância pode ter terminado entre a leitura e o lock.
        const again = await readCache();
        if (again) return respond(again, true);
        // Quem esperou e encontra o lock livre sem resultado: o cálculo anterior falhou.
        if (waited) throw new SearchUnavailableError("calculo_anterior_falhou");

        await enforceRateLimit(store, "new", ipHash, limits.newPerMinute, now());
        const evaluation = await withInflightSlot(store, limits.maxConcurrent, () =>
          evaluate(theme, companies, deps.getConfig(), deps.batchOptions),
        );
        try {
          await store.set(cacheKey, encodeEvaluation(evaluation), CACHE_TTL_SECONDS);
        } catch {
          log("cache_write_failed");
        }
        return respond(evaluation, false);
      } finally {
        await store.delIfEquals(lockKey, token).catch(() => log("lock_release_failed"));
      }
    }

    // Já há uma busca igual em andamento: aguarda e reutiliza o resultado.
    waited = true;
    if (now() - started > MAX_WAIT_MS) throw new SearchUnavailableError("timeout");
    await sleep(POLL_MS);
  }
}
