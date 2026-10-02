import { describe, expect, it, vi } from "vitest";
import {
  FallbackStore,
  MemoryStore,
  RedisStore,
  StoreConfigError,
  StoreUnavailableError,
  createStore,
  isStrictEnv,
} from "@/lib/store";
import type { RedisLike, Store } from "@/lib/store";

describe("MemoryStore", () => {
  it("respeita TTL", async () => {
    let t = 0;
    const s = new MemoryStore(() => t);
    await s.set("k", "v", 10);
    expect(await s.get("k")).toBe("v");
    t = 9_999;
    expect(await s.get("k")).toBe("v");
    t = 10_000;
    expect(await s.get("k")).toBeNull();
  });

  it("setNx só cria uma vez e delIfEquals só remove o dono", async () => {
    const s = new MemoryStore();
    expect(await s.setNx("lock", "a", 60)).toBe(true);
    expect(await s.setNx("lock", "b", 60)).toBe(false);
    await s.delIfEquals("lock", "b");
    expect(await s.get("lock")).toBe("a");
    await s.delIfEquals("lock", "a");
    expect(await s.get("lock")).toBeNull();
    expect(await s.setNx("lock", "c", 60)).toBe(true);
  });

  it("incr conta e a janela expira", async () => {
    let t = 0;
    const s = new MemoryStore(() => t);
    expect(await s.incr("c", 70)).toBe(1);
    expect(await s.incr("c", 70)).toBe(2);
    t = 70_001;
    expect(await s.incr("c", 70)).toBe(1);
  });
});

function fakeRedis() {
  const calls: Array<[string, ...unknown[]]> = [];
  const redis: RedisLike = {
    get: async (k) => (calls.push(["get", k]), k === "hit" ? "valor" : null),
    set: async (k, v, o) => (calls.push(["set", k, v, o]), o.nx ? "OK" : "OK"),
    del: async (k) => (calls.push(["del", k]), 1),
    eval: async (script, keys, args) => (calls.push(["eval", keys, args, script]), 1),
    pipeline: () => {
      const ops: unknown[] = [];
      const p = {
        incr: (k: string) => (ops.push(["incr", k]), p),
        expire: (k: string, s: number) => (ops.push(["expire", k, s]), p),
        exec: async () => (calls.push(["pipeline", ...ops]), [7, 1]),
      };
      return p;
    },
  };
  return { redis, calls };
}

describe("RedisStore", () => {
  it("usa SET com EX e NX, INCR+EXPIRE em pipeline e liberação com script", async () => {
    const { redis, calls } = fakeRedis();
    const s = new RedisStore(redis);
    expect(await s.get("hit")).toBe("valor");
    expect(await s.get("miss")).toBeNull();
    await s.set("k", "v", 604800);
    expect(await s.setNx("lock", "tok", 60)).toBe(true);
    expect(await s.incr("rl", 70)).toBe(7);
    await s.delIfEquals("lock", "tok");
    expect(calls).toContainEqual(["set", "k", "v", { ex: 604800 }]);
    expect(calls).toContainEqual(["set", "lock", "tok", { ex: 60, nx: true }]);
    expect(calls).toContainEqual(["pipeline", ["incr", "rl"], ["expire", "rl", 70]]);
    expect(calls.some((c) => c[0] === "eval" && JSON.stringify(c[1]) === '["lock"]')).toBe(true);
  });
});

describe("FallbackStore", () => {
  it("cai para a memória quando o Redis falha", async () => {
    const broken: Store = new MemoryStore();
    broken.get = async () => {
      throw new Error("redis fora");
    };
    broken.incr = async () => {
      throw new Error("redis fora");
    };
    const onError = vi.fn();
    const s = new FallbackStore(broken, new MemoryStore(), onError);
    expect(await s.get("x")).toBeNull();
    expect(await s.incr("c", 60)).toBe(1);
    expect(await s.incr("c", 60)).toBe(2);
    expect(onError).toHaveBeenCalledTimes(3);
  });
});

describe("leases de concorrência (MemoryStore)", () => {
  it("respeita o máximo e libera o slot", async () => {
    const s = new MemoryStore();
    expect(await s.acquireLease("slots", "a", 2, 90, 0)).toBe(true);
    expect(await s.acquireLease("slots", "b", 2, 90, 0)).toBe(true);
    expect(await s.acquireLease("slots", "c", 2, 90, 0)).toBe(false);
    await s.releaseLease("slots", "a");
    expect(await s.acquireLease("slots", "c", 2, 90, 0)).toBe(true);
  });

  it("lease de instância que morreu vence sozinho pelo TTL", async () => {
    const s = new MemoryStore();
    await s.acquireLease("slots", "morta", 1, 90, 0);
    expect(await s.acquireLease("slots", "nova", 1, 90, 89_999)).toBe(false);
    expect(await s.acquireLease("slots", "nova", 1, 90, 90_000)).toBe(true);
  });
});

describe("leases (RedisStore)", () => {
  it("usa script Lua atômico com limpeza de vencidos, TTL e liberação por token", async () => {
    const { redis, calls } = fakeRedis();
    const s = new RedisStore(redis);
    expect(await s.acquireLease("slots", "tok", 16, 90, 123_000)).toBe(true);
    await s.releaseLease("slots", "tok");
    const acquire = calls.find((c) => c[0] === "eval" && String(c[3]).includes("ZCARD"))!;
    expect(acquire[1]).toEqual(["slots"]);
    expect(acquire[2]).toEqual(["123000", "90000", "16", "tok"]);
    expect(String(acquire[3])).toContain("ZREMRANGEBYSCORE");
    expect(String(acquire[3])).toContain("PEXPIRE");
    expect(calls.some((c) => c[0] === "eval" && String(c[3]).includes("ZREM") && JSON.stringify(c[2]) === '["tok"]')).toBe(true);
  });
});

describe("createStore", () => {
  const redisEnv = { REDIS_URL: "https://x.upstash.io", REDIS_TOKEN: "t" };

  it("usa memória localmente sem Redis", () => {
    expect(createStore({ NODE_ENV: "development" })).toBeInstanceOf(MemoryStore);
    expect(createStore({ NODE_ENV: "production" })).toBeInstanceOf(MemoryStore); // next start local
    expect(createStore({ VERCEL_ENV: "development" })).toBeInstanceOf(MemoryStore);
  });

  it("local com Redis usa fallback em memória se o Redis cair", () => {
    expect(createStore(redisEnv)).toBeInstanceOf(FallbackStore);
    expect(
      createStore({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" }),
    ).toBeInstanceOf(FallbackStore);
  });

  it("production/preview da Vercel exigem Redis e não têm fallback silencioso", () => {
    for (const VERCEL_ENV of ["production", "preview"]) {
      expect(isStrictEnv({ VERCEL_ENV })).toBe(true);
      expect(() => createStore({ VERCEL_ENV })).toThrow(StoreConfigError);
      expect(() => createStore({ VERCEL_ENV })).toThrow(StoreUnavailableError);
      const strict = createStore({ ...redisEnv, VERCEL_ENV });
      expect(strict).toBeInstanceOf(RedisStore);
      expect(strict).not.toBeInstanceOf(FallbackStore);
    }
    expect(isStrictEnv({ VERCEL_ENV: "development" })).toBe(false);
  });
});
