import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/search/route";
import { okResponse } from "./helpers";

const post = (body: unknown, ip = "9.9.9.9") =>
  POST(
    new Request("http://localhost/api/search", {
      method: "POST",
      headers: { "x-real-ip": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

function mockJev() {
  vi.stubEnv("TYPESAFE_API_KEY", "chave-que-nao-pode-vazar");
  vi.stubEnv("JEV_API_URL", "https://jev.test/v1/systemone");
  return vi.spyOn(globalThis, "fetch").mockImplementation((async (_u: string, init: RequestInit) =>
    okResponse(Object.keys(JSON.parse(init.body as string).questions))) as unknown as typeof fetch);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/search", () => {
  it("rejeita tema curto, longo, ausente, JSON inválido e corpo gigante", async () => {
    expect((await post({ theme: "a" })).status).toBe(400);
    expect((await post({ theme: "x".repeat(81) })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post("não é json")).status).toBe(400);
    expect((await post({ theme: "data centers", lixo: "x".repeat(2000) })).status).toBe(400);
  });

  it("aceita temas de 2 a 80 caracteres e normaliza espaços para exibição", async () => {
    mockJev();
    const res = await post({ theme: "  data    centers  " }, "1.1.1.1");
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.theme).toBe("data centers");
    expect(json.results).toHaveLength(1000);
  });

  it("segunda busca equivalente vem do cache, sem novas chamadas ao Jev", async () => {
    const spy = mockJev();
    const first = await (await post({ theme: "Celulose Teste" }, "2.2.2.2")).json();
    const calls = spy.mock.calls.length;
    expect(calls).toBe(4);
    const second = await (await post({ theme: "celulose   teste " }, "2.2.2.2")).json();
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(spy.mock.calls.length).toBe(calls);
  });

  it("responde 429 limpo, com Retry-After, quando o limite de buscas novas é excedido", async () => {
    mockJev();
    vi.stubEnv("SEARCH_RATE_LIMIT_NEW_PER_MIN", "1");
    expect((await post({ theme: "tema limite um" }, "3.3.3.3")).status).toBe(200);
    const res = await post({ theme: "tema limite dois" }, "3.3.3.3");
    const text = await res.text();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(text).toContain("Muitas buscas em pouco tempo");
    expect(text).not.toContain("chave-que-nao-pode-vazar");
    // outro IP segue funcionando; e o mesmo IP ainda recebe resultados em cache
    expect((await post({ theme: "tema limite dois" }, "4.4.4.4")).status).toBe(200);
    expect((await post({ theme: "tema limite um" }, "3.3.3.3")).status).toBe(200);
  });

  it("só `theme` do corpo é usado: URL, modelo e chave não são controláveis", async () => {
    const spy = mockJev();
    vi.stubEnv("JEV_MODEL", "jev-env");
    const res = await post(
      { theme: "tema protegido", url: "https://evil.example", endpoint: "https://evil.example", model: "outro", apiKey: "x" },
      "5.5.5.5",
    );
    const text = await res.text();
    expect(res.status).toBe(200);
    for (const [url, init] of spy.mock.calls) {
      expect(url).toBe("https://jev.test/v1/systemone");
      expect(JSON.parse((init as RequestInit).body as string).model).toBe("jev-env");
    }
    expect(text).not.toContain("chave-que-nao-pode-vazar");
    expect(text).not.toContain("Bearer");
    expect(text).not.toContain("jev.test");
  });

  it("devolve erro amigável sem detalhes internos nem a chave e não cacheia a falha", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "chave-que-nao-pode-vazar");
    vi.stubEnv("JEV_API_URL", "https://jev.invalid/v1/systemone");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("boom chave-que-nao-pode-vazar"));
    const res = await post({ theme: "tema com falha" }, "6.6.6.6");
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).toContain("Não foi possível concluir esta análise. Tente novamente.");
    expect(text).not.toContain("chave-que-nao-pode-vazar");
    expect(text).not.toContain("jev.invalid");

    // a falha não foi cacheada: a tentativa seguinte chega ao Jev de novo e funciona
    spy.mockImplementation((async (_u: string, init: RequestInit) =>
      okResponse(Object.keys(JSON.parse(init.body as string).questions))) as unknown as typeof fetch);
    const retry = await post({ theme: "tema com falha" }, "6.6.6.6");
    expect(retry.status).toBe(200);
    expect((await retry.json()).cached).toBe(false);
  });

  it("sem chave configurada também devolve erro amigável", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ theme: "tema sem chave" }, "7.7.7.7");
    expect(res.status).toBe(502);
  });
});
