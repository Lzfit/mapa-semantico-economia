import { Redis } from "@upstash/redis";

/**
 * Armazenamento chave-valor usado por cache, lock de deduplicação, rate limit e
 * teto de concorrência. Produção: Redis (Upstash, via REST, compatível com
 * serverless/Vercel). Local: memória do processo.
 */
export interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** SET NX com TTL; `true` se a chave foi criada por esta chamada. */
  setNx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
  /** Remove a chave só se ainda guardar `value` (liberação segura de lock). */
  delIfEquals(key: string, value: string): Promise<void>;
  /** INCR atômico; renova o TTL da chave. */
  incr(key: string, ttlSeconds: number): Promise<number>;
  /**
   * Lease distribuído de concorrência: ocupa um dos `max` slots por `ttlSeconds`.
   * Leases vencidos são descartados, então uma instância que morre não prende o slot.
   */
  acquireLease(key: string, token: string, max: number, ttlSeconds: number, nowMs: number): Promise<boolean>;
  releaseLease(key: string, token: string): Promise<void>;
}

/** O armazenamento distribuído falhou ou não está configurado. */
export class StoreUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("store_unavailable");
    this.cause = cause;
  }
}

export class MemoryStore implements Store {
  private data = new Map<string, { value: string; expiresAt: number }>();

  constructor(private now: () => number = Date.now) {}

  private live(key: string) {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  async get(key: string) {
    return this.live(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    this.data.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
  }

  async setNx(key: string, value: string, ttlSeconds: number) {
    if (this.live(key)) return false;
    await this.set(key, value, ttlSeconds);
    return true;
  }

  async del(key: string) {
    this.data.delete(key);
  }

  async delIfEquals(key: string, value: string) {
    if (this.live(key)?.value === value) this.data.delete(key);
  }

  async incr(key: string, ttlSeconds: number) {
    const next = Number(this.live(key)?.value ?? 0) + 1;
    await this.set(key, String(next), ttlSeconds);
    return next;
  }

  private leases = new Map<string, Map<string, number>>();

  async acquireLease(key: string, token: string, max: number, ttlSeconds: number, nowMs: number) {
    const slots = this.leases.get(key) ?? new Map<string, number>();
    for (const [t, expiresAt] of slots) if (expiresAt <= nowMs) slots.delete(t);
    this.leases.set(key, slots);
    if (slots.size >= max) return false;
    slots.set(token, nowMs + ttlSeconds * 1000);
    return true;
  }

  async releaseLease(key: string, token: string) {
    this.leases.get(key)?.delete(token);
  }
}

/** Subconjunto do cliente `@upstash/redis` que usamos (facilita testar). */
export interface RedisLike {
  get(key: string): Promise<unknown>;
  set(key: string, value: string, opts: { ex: number; nx?: boolean }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  pipeline(): {
    incr(key: string): unknown;
    expire(key: string, seconds: number): unknown;
    exec(): Promise<unknown[]>;
  };
}

const DEL_IF_EQUALS = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

// Conjunto ordenado token → expiração; remove vencidos e respeita o máximo de forma atômica.
const ACQUIRE_LEASE = `redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
if redis.call('ZCARD', KEYS[1]) >= tonumber(ARGV[3]) then return 0 end
redis.call('ZADD', KEYS[1], tonumber(ARGV[1]) + tonumber(ARGV[2]), ARGV[4])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1`;
const RELEASE_LEASE = `return redis.call('ZREM', KEYS[1], ARGV[1])`;

export class RedisStore implements Store {
  constructor(private redis: RedisLike) {}

  async get(key: string) {
    const value = await this.redis.get(key);
    return value === null || value === undefined ? null : String(value);
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.redis.set(key, value, { ex: ttlSeconds });
  }

  async setNx(key: string, value: string, ttlSeconds: number) {
    return (await this.redis.set(key, value, { ex: ttlSeconds, nx: true })) === "OK";
  }

  async del(key: string) {
    await this.redis.del(key);
  }

  async delIfEquals(key: string, value: string) {
    await this.redis.eval(DEL_IF_EQUALS, [key], [value]);
  }

  async incr(key: string, ttlSeconds: number) {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, ttlSeconds);
    const [count] = await pipeline.exec();
    return Number(count);
  }

  async acquireLease(key: string, token: string, max: number, ttlSeconds: number, nowMs: number) {
    const ok = await this.redis.eval(
      ACQUIRE_LEASE,
      [key],
      [String(nowMs), String(ttlSeconds * 1000), String(max), token],
    );
    return Number(ok) === 1;
  }

  async releaseLease(key: string, token: string) {
    await this.redis.eval(RELEASE_LEASE, [key], [token]);
  }
}

/**
 * Se o Redis falhar em tempo de execução, cada operação cai para a memória do
 * processo (proteção por instância) em vez de derrubar a busca.
 */
export class FallbackStore implements Store {
  constructor(
    private primary: Store,
    private fallback: Store,
    private onError: (err: unknown) => void = () => {},
  ) {}

  private async run<T>(op: (s: Store) => Promise<T>): Promise<T> {
    try {
      return await op(this.primary);
    } catch (err) {
      this.onError(err);
      return op(this.fallback);
    }
  }

  get = (key: string) => this.run((s) => s.get(key));
  set = (key: string, value: string, ttl: number) => this.run((s) => s.set(key, value, ttl));
  setNx = (key: string, value: string, ttl: number) => this.run((s) => s.setNx(key, value, ttl));
  del = (key: string) => this.run((s) => s.del(key));
  delIfEquals = (key: string, value: string) => this.run((s) => s.delIfEquals(key, value));
  incr = (key: string, ttl: number) => this.run((s) => s.incr(key, ttl));
  acquireLease = (key: string, token: string, max: number, ttl: number, nowMs: number) =>
    this.run((s) => s.acquireLease(key, token, max, ttl, nowMs));
  releaseLease = (key: string, token: string) => this.run((s) => s.releaseLease(key, token));
}

export class StoreConfigError extends StoreUnavailableError {}

export interface StoreEnv {
  REDIS_URL?: string;
  REDIS_TOKEN?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  VERCEL_ENV?: string;
  NODE_ENV?: string;
}

/**
 * Deploys da Vercel (production e preview) exigem Redis e nunca caem para
 * memória: sem a proteção distribuída a busca responde 503 antes de chegar ao
 * Jev. Local/desenvolvimento usa memória (ou Redis com fallback em memória).
 */
export function isStrictEnv(env: StoreEnv): boolean {
  return env.VERCEL_ENV === "production" || env.VERCEL_ENV === "preview";
}

export function createStore(env: StoreEnv = process.env as StoreEnv): Store {
  const url = env.REDIS_URL?.trim() || env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.REDIS_TOKEN?.trim() || env.UPSTASH_REDIS_REST_TOKEN?.trim();
  const strict = isStrictEnv(env);

  if (url && token) {
    const redis = new Redis({ url, token, automaticDeserialization: false });
    const store = new RedisStore(redis as unknown as RedisLike);
    if (strict) return store; // erros do Redis propagam; nada de fallback silencioso
    return new FallbackStore(store, new MemoryStore(), (err) =>
      console.error("redis_error", err instanceof Error ? err.message : "erro desconhecido"),
    );
  }
  if (strict) {
    throw new StoreConfigError(new Error("Redis não configurado (REDIS_URL e REDIS_TOKEN)."));
  }
  if (env.NODE_ENV === "production") {
    console.warn("Redis não configurado: usando cache em memória (apenas desenvolvimento/local).");
  }
  return new MemoryStore();
}

let singleton: Store | null = null;

export function getStore(): Store {
  singleton ??= createStore();
  return singleton;
}
