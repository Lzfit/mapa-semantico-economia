import { describe, expect, it, vi } from "vitest";
import { loadCompanies } from "@/lib/companies";
import { readJevConfig } from "@/lib/jev";
import { CACHE_TTL_SECONDS, cacheKeyFor, decodeEvaluation, lockKeyFor, normalizeThemeKey } from "@/lib/searchCache";
import {
  BusyError,
  RateLimitedError,
  SearchUnavailableError,
  StoreUnavailableError,
  handleSearch,
  readLimits,
} from "@/lib/searchService";
import type { Limits, SearchDeps } from "@/lib/searchService";
import { evaluateTheme } from "@/lib/search";
import { FallbackStore, MemoryStore } from "@/lib/store";
import type { Store } from "@/lib/store";
import type { Evaluation } from "@/lib/searchCache";
import { LOCK_TTL_SECONDS } from "@/lib/searchService";
import { SLOT_LEASE_SECONDS, withConcurrencySlot } from "@/lib/rateLimit";
import { mockConfig, okResponse } from "./helpers";

const companies = loadCompanies();
const limits: Limits = { newPerMinute: 10, allPerMinute: 120, maxConcurrent: 16 };

const evaluation = (model = "m"): Evaluation => ({
  model,
  scores: companies.map((c, i) => (c.undisclosed ? null : (i % 100) / 100)),
});

function deps(over: Partial<SearchDeps> = {}) {
  const store = new MemoryStore();
  const evaluate = vi.fn(async () => evaluation());
  const d: SearchDeps = {
    store,
    companies,
    getConfig: () => mockConfig(fetch),
    limits,
    evaluate: evaluate as unknown as SearchDeps["evaluate"],
    sleep: () => new Promise((r) => setTimeout(r, 2)),
    ...over,
  };
  return { d, store, evaluate };
}

describe("normalização da query", () => {
  it("'Data Centers', 'data centers ' e 'data   centers' usam a mesma chave", () => {
    const keys = ["Data Centers", "data centers ", "data   centers", "  DATA\tcenters"].map(cacheKeyFor);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("jev-search:v1:data centers");
  });

  it("não faz stemming, tradução nem remove acentos", () => {
    expect(normalizeThemeKey("Café")).toBe("café");
    expect(normalizeThemeKey("café")).not.toBe(normalizeThemeKey("cafe"));
    expect(normalizeThemeKey("data center")).not.toBe(normalizeThemeKey("data centers"));
    expect(normalizeThemeKey("coffee")).not.toBe(normalizeThemeKey("café"));
  });

  it("preserva o texto original para exibição", async () => {
    const { d } = deps();
    const res = await handleSearch("Data  Centers", "ip1", d);
    expect(res.theme).toBe("Data  Centers");
  });

  it("chave de lock é separada e versionada", () => {
    expect(lockKeyFor("A  b")).toBe("jev-search:lock:v1:a b");
  });
});

describe("cache", () => {
  it("miss calcula e grava com TTL de 7 dias; hit não chama o Jev", async () => {
    const { d, store, evaluate } = deps();
    const setSpy = vi.spyOn(store, "set");
    const first = await handleSearch("data centers", "ip1", d);
    expect(first.cached).toBe(false);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(cacheKeyFor("data centers"), expect.any(String), CACHE_TTL_SECONDS);
    expect(CACHE_TTL_SECONDS).toBe(604_800);

    const second = await handleSearch("DATA   centers", "ip1", d);
    expect(second.cached).toBe(true);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(second.results.map((r) => r.associationScore)).toEqual(first.results.map((r) => r.associationScore));
    expect(second.results[417].associationScore).toBeNull();
  });

  it("nunca cacheia erro nem resultado parcial", async () => {
    const { d, store, evaluate } = deps();
    evaluate.mockRejectedValueOnce(new Error("jev fora"));
    await expect(handleSearch("seca", "ip1", d)).rejects.toThrow("jev fora");
    expect(await store.get(cacheKeyFor("seca"))).toBeNull();
    expect(await store.get(lockKeyFor("seca"))).toBeNull(); // lock liberado

    const res = await handleSearch("seca", "ip1", d); // próxima tentativa recalcula
    expect(res.cached).toBe(false);
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it("payload inválido/parcial no cache conta como miss", async () => {
    const { d, store, evaluate } = deps();
    const partial = JSON.stringify({ v: 1, model: "m", scores: evaluation().scores.slice(0, 750) });
    await store.set(cacheKeyFor("café"), partial, 60);
    const res = await handleSearch("café", "ip1", d);
    expect(res.cached).toBe(false);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(decodeEvaluation(partial, companies)).toBeNull();
    const withZeroOn418 = evaluation();
    withZeroOn418.scores[417] = 0;
    expect(decodeEvaluation(JSON.stringify({ v: 1, ...withZeroOn418 }), companies)).toBeNull();
  });

  it("falha ao gravar o cache não derruba a busca já calculada", async () => {
    const inner = new MemoryStore();
    const store: Store = {
      get: (k) => inner.get(k),
      set: async () => {
        throw new Error("x");
      },
      setNx: (k, v, t) => inner.setNx(k, v, t),
      del: (k) => inner.del(k),
      delIfEquals: (k, v) => inner.delIfEquals(k, v),
      incr: (k, t) => inner.incr(k, t),
      acquireLease: (k, t, m, ttl, n) => inner.acquireLease(k, t, m, ttl, n),
      releaseLease: (k, t) => inner.releaseLease(k, t),
    };
    const { d } = deps({ store });
    const log = vi.fn();
    const res = await handleSearch("café", "ip1", { ...d, log });
    expect(res.cached).toBe(false);
    expect(log).toHaveBeenCalledWith("cache_write_failed");
  });
});

describe("deduplicação de buscas simultâneas", () => {
  it("só uma execução chega ao Jev e as demais reutilizam o resultado", async () => {
    const { d, evaluate } = deps();
    evaluate.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 60));
      return evaluation();
    });
    const variants = ["data centers", "Data Centers", "data   centers ", "DATA CENTERS", "data centers"];
    const results = await Promise.all(variants.map((v, i) => handleSearch(v, `ip${i}`, d)));
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => !r.cached)).toHaveLength(1);
    expect(results.filter((r) => r.cached)).toHaveLength(4);
    expect(new Set(results.map((r) => JSON.stringify(r.results))).size).toBe(1);
  });

  it("buscas diferentes não se bloqueiam", async () => {
    const { d, evaluate } = deps();
    await Promise.all([handleSearch("café", "ip1", d), handleSearch("seca", "ip2", d)]);
    expect(evaluate).toHaveBeenCalledTimes(2);
  });

  it("se o cálculo em andamento falha, quem esperou não chama o Jev de novo", async () => {
    const { d, evaluate } = deps();
    evaluate.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 40));
      throw new Error("jev fora");
    });
    const [a, b] = await Promise.allSettled([
      handleSearch("seca", "ip1", d),
      handleSearch("seca", "ip2", d),
    ]);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(a.status).toBe("rejected");
    expect(b.status).toBe("rejected");
    expect((b as PromiseRejectedResult).reason).toBeInstanceOf(SearchUnavailableError);
  });
});

describe("rate limiting", () => {
  it("bloqueia a 11ª busca não cacheada no minuto com RateLimitedError (429)", async () => {
    const { d, evaluate } = deps({ now: () => 1_000_000 });
    for (let i = 0; i < 10; i++) await handleSearch(`tema ${i}`, "ipA", d);
    const err = await handleSearch("tema 10", "ipA", d).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    expect((err as RateLimitedError).retryAfterSeconds).toBeGreaterThan(0);
    expect((err as RateLimitedError).retryAfterSeconds).toBeLessThanOrEqual(60);
    expect(evaluate).toHaveBeenCalledTimes(10);
    // outro IP não é afetado
    await expect(handleSearch("tema 10", "ipB", d)).resolves.toBeDefined();
  });

  it("buscas servidas por cache não consomem o limite de buscas novas", async () => {
    const { d, evaluate } = deps({ now: () => 2_000_000 });
    for (let i = 0; i < 9; i++) await handleSearch(`tema ${i}`, "ipA", d);
    for (let i = 0; i < 50; i++) await handleSearch("tema 0", "ipA", d); // 50 hits
    await expect(handleSearch("tema novo", "ipA", d)).resolves.toBeDefined(); // 10ª nova
    expect(evaluate).toHaveBeenCalledTimes(10);
  });

  it("limite geral permissivo também responde 429", async () => {
    const { d } = deps({ now: () => 3_000_000, limits: { ...limits, allPerMinute: 5 } });
    for (let i = 0; i < 5; i++) await handleSearch("café", "ipA", d);
    await expect(handleSearch("café", "ipA", d)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("a janela reinicia no minuto seguinte", async () => {
    let t = 4_000_000;
    const { d } = deps({ now: () => t, limits: { ...limits, newPerMinute: 1 } });
    await handleSearch("a", "ipA", d);
    await expect(handleSearch("b", "ipA", d)).rejects.toBeInstanceOf(RateLimitedError);
    t += 60_000;
    await expect(handleSearch("b", "ipA", d)).resolves.toBeDefined();
  });

  it("busca limitada libera o lock e não grava cache", async () => {
    const { d, store } = deps({ now: () => 5_000_000, limits: { ...limits, newPerMinute: 1 } });
    await handleSearch("a", "ipA", d);
    await expect(handleSearch("b", "ipA", d)).rejects.toBeInstanceOf(RateLimitedError);
    expect(await store.get(lockKeyFor("b"))).toBeNull();
    expect(await store.get(cacheKeyFor("b"))).toBeNull();
  });
});

describe("teto de concorrência global", () => {
  it("recusa com BusyError acima do limite e libera o slot ao terminar", async () => {
    const { d, evaluate } = deps({ limits: { ...limits, maxConcurrent: 2 } });
    evaluate.mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 40));
      return evaluation();
    });
    const settled = await Promise.allSettled(
      ["a", "b", "c"].map((t, i) => handleSearch(t, `ip${i}`, d)),
    );
    expect(settled.filter((s) => s.status === "fulfilled")).toHaveLength(2);
    const rejected = settled.find((s) => s.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(BusyError);
    await expect(handleSearch("c", "ip9", d)).resolves.toBeDefined(); // slot liberado
  });
});

describe("limites configuráveis", () => {
  it("usa padrões (10/min novas, 120/min todas, 16 simultâneas) e aceita env", () => {
    expect(readLimits({} as NodeJS.ProcessEnv)).toEqual({ newPerMinute: 10, allPerMinute: 120, maxConcurrent: 16 });
    expect(
      readLimits({ SEARCH_RATE_LIMIT_NEW_PER_MIN: "3", JEV_MAX_CONCURRENT_SEARCHES: "x" } as unknown as NodeJS.ProcessEnv),
    ).toMatchObject({ newPerMinute: 3, maxConcurrent: 16 });
  });
});

describe("linha 418 e comportamento existente", () => {
  it("continua fora do Jev e os 4 batches paralelos (250+250+250+249) não mudam", async () => {
    const sizes: number[] = [];
    const ids: string[] = [];
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      const q = Object.keys(JSON.parse(init.body as string).questions);
      sizes.push(q.length);
      ids.push(...q);
      return okResponse(q);
    }) as unknown as typeof fetch;
    const { d } = deps({
      evaluate: evaluateTheme,
      getConfig: () => mockConfig(fetchImpl),
    });
    const res = await handleSearch("data centers", "ip1", d);
    expect(sizes.sort()).toEqual([249, 250, 250, 250]);
    expect(ids).toHaveLength(999);
    expect(ids).not.toContain("e0418");
    expect(res.results).toHaveLength(1000);
    expect(res.results[417]).toMatchObject({ company: "Empresa não divulgada", associationScore: null });
  });

  it("o endpoint do Jev não é sobrescrevível em produção na Vercel", () => {
    const env = { TYPESAFE_API_KEY: "k", JEV_API_URL: "https://evil.example/x", VERCEL_ENV: "production" };
    expect(readJevConfig(env as unknown as NodeJS.ProcessEnv).endpoint).toBe("https://api.typesafe.ai/v1/systemone");
    const dev = { TYPESAFE_API_KEY: "k", JEV_API_URL: "http://localhost:4010/x" };
    expect(readJevConfig(dev as unknown as NodeJS.ProcessEnv).endpoint).toBe("http://localhost:4010/x");
  });
});

/** Store cujas operações podem ser derrubadas, como um Redis fora do ar. */
function downableStore(inner: Store = new MemoryStore()) {
  const state = { down: false };
  const guard = <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    (...a: A) => (state.down ? Promise.reject(new Error("redis fora")) : fn(...a));
  const store: Store = {
    get: guard((k: string) => inner.get(k)),
    set: guard((k: string, v: string, t: number) => inner.set(k, v, t)),
    setNx: guard((k: string, v: string, t: number) => inner.setNx(k, v, t)),
    del: guard((k: string) => inner.del(k)),
    delIfEquals: guard((k: string, v: string) => inner.delIfEquals(k, v)),
    incr: guard((k: string, t: number) => inner.incr(k, t)),
    acquireLease: guard((k: string, t: string, m: number, ttl: number, n: number) =>
      inner.acquireLease(k, t, m, ttl, n)),
    releaseLease: guard((k: string, t: string) => inner.releaseLease(k, t)),
  };
  return { store, state };
}

describe("lock de deduplicação com TTL e dono", () => {
  it("grava o lock com TTL maior que o maxDuration da rota", async () => {
    const { d, store } = deps();
    const setNx = vi.spyOn(store, "setNx");
    await handleSearch("café", "ip1", d);
    expect(setNx).toHaveBeenCalledWith(lockKeyFor("café"), expect.any(String), LOCK_TTL_SECONDS);
    expect(LOCK_TTL_SECONDS).toBeGreaterThan(60);
  });

  it("lock de instância que morreu expira e não bloqueia a query para sempre", async () => {
    let t = 1_000_000;
    const store = new MemoryStore(() => t);
    const { d, evaluate } = deps({ store, now: () => t });
    await store.setNx(lockKeyFor("café"), "instancia-morta", LOCK_TTL_SECONDS);
    t += LOCK_TTL_SECONDS * 1000;
    const res = await handleSearch("café", "ip1", d);
    expect(res.cached).toBe(false);
    expect(evaluate).toHaveBeenCalledTimes(1);
  });

  it("só o dono libera o lock: lock reassumido por outra instância é preservado", async () => {
    let t = 1_000_000;
    const store = new MemoryStore(() => t);
    const { d, evaluate } = deps({ store, now: () => t });
    evaluate.mockImplementation(async () => {
      // o lock vence durante a busca lenta e outra instância o assume
      t += (LOCK_TTL_SECONDS + 1) * 1000;
      expect(await store.setNx(lockKeyFor("café"), "outra-instancia", LOCK_TTL_SECONDS)).toBe(true);
      return evaluation();
    });
    await handleSearch("café", "ip1", d);
    expect(await store.get(lockKeyFor("café"))).toBe("outra-instancia");
  });

  it("o dono libera o próprio lock ao terminar, com sucesso ou erro", async () => {
    const { d, store, evaluate } = deps();
    await handleSearch("a", "ip1", d);
    expect(await store.get(lockKeyFor("a"))).toBeNull();
    evaluate.mockRejectedValueOnce(new Error("jev fora"));
    await expect(handleSearch("b", "ip1", d)).rejects.toThrow();
    expect(await store.get(lockKeyFor("b"))).toBeNull();
  });
});

describe("slot de concorrência não vaza", () => {
  it("erro dentro da busca libera o slot (finally)", async () => {
    const { d, store, evaluate } = deps({ limits: { ...limits, maxConcurrent: 1 } });
    evaluate.mockRejectedValueOnce(new Error("jev fora"));
    await expect(handleSearch("a", "ip1", d)).rejects.toThrow("jev fora");
    const spy = vi.spyOn(store, "releaseLease");
    await expect(handleSearch("b", "ip2", d)).resolves.toBeDefined(); // só 1 slot e ele voltou
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("instância que morre sem liberar perde o slot pelo lease (TTL)", async () => {
    const store = new MemoryStore();
    let t = 5_000_000;
    const never = new Promise<never>(() => {});
    void withConcurrencySlot(store, 1, () => t, () => never); // "morreu": nunca libera
    await expect(withConcurrencySlot(store, 1, () => t, async () => "x")).rejects.toBeInstanceOf(BusyError);
    t += SLOT_LEASE_SECONDS * 1000;
    await expect(withConcurrencySlot(store, 1, () => t, async () => "x")).resolves.toBe("x");
  });

  it("falha ao liberar o slot não esconde o resultado da busca", async () => {
    const store = new MemoryStore();
    vi.spyOn(store, "releaseLease").mockRejectedValue(new Error("redis fora"));
    await expect(withConcurrencySlot(store, 1, Date.now, async () => "ok")).resolves.toBe("ok");
  });
});

describe("Redis indisponível", () => {
  it("em produção (store estrito): StoreUnavailableError antes de chamar o Jev", async () => {
    const { store, state } = downableStore();
    const { d, evaluate } = deps({ store });
    state.down = true;
    await expect(handleSearch("café", "ip1", d)).rejects.toBeInstanceOf(StoreUnavailableError);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("falha no lock ou no slot também aborta antes do Jev", async () => {
    const base = downableStore();
    const { d, evaluate } = deps({ store: base.store });
    vi.spyOn(base.store, "setNx").mockRejectedValue(new Error("x"));
    await expect(handleSearch("a", "ip1", d)).rejects.toBeInstanceOf(StoreUnavailableError);
    const base2 = downableStore();
    const d2 = deps({ store: base2.store, evaluate });
    vi.spyOn(base2.store, "acquireLease").mockRejectedValue(new Error("x"));
    await expect(handleSearch("b", "ip1", d2.d)).rejects.toBeInstanceOf(StoreUnavailableError);
    expect(evaluate).not.toHaveBeenCalled();
  });

  it("em desenvolvimento (FallbackStore): usa memória local e a busca funciona", async () => {
    const primary = downableStore();
    primary.state.down = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { d, evaluate } = deps({ store: new FallbackStore(primary.store, new MemoryStore()) });
    const res = await handleSearch("café", "ip1", d);
    expect(res.cached).toBe(false);
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect((await handleSearch("café", "ip1", d)).cached).toBe(true);
  });
});
