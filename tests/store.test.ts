import { describe, expect, it, vi } from "vitest";
import { FallbackStore, MemoryStore, RedisStore, StoreConfigError, createStore } from "@/lib/store";
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
    expect(await s.decr("c")).toBe(1);
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
    decr: async (k) => (calls.push(["decr", k]), 4),
    eval: async (_s, keys, args) => (calls.push(["eval", keys, args]), 1),
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

describe("createStore", () => {
  it("usa memória localmente sem Redis", () => {
    expect(createStore({ NODE_ENV: "development" })).toBeInstanceOf(MemoryStore);
  });

  it("usa Redis quando REDIS_URL/REDIS_TOKEN (ou UPSTASH_*) existem", () => {
    expect(createStore({ REDIS_URL: "https://x.upstash.io", REDIS_TOKEN: "t" })).toBeInstanceOf(FallbackStore);
    expect(
      createStore({ UPSTASH_REDIS_REST_URL: "https://x.upstash.io", UPSTASH_REDIS_REST_TOKEN: "t" }),
    ).toBeInstanceOf(FallbackStore);
  });

  it("produção na Vercel sem Redis falha em vez de cair para memória", () => {
    expect(() => createStore({ VERCEL_ENV: "production" })).toThrow(StoreConfigError);
    expect(createStore({ VERCEL_ENV: "preview" })).toBeInstanceOf(MemoryStore);
  });
});
