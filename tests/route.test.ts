import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/search/route";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/search", { method: "POST", body: JSON.stringify(body) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/search", () => {
  it("rejeita tema curto, longo ou ausente", async () => {
    expect((await post({ theme: "a" })).status).toBe(400);
    expect((await post({ theme: "x".repeat(81) })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("devolve erro amigável sem detalhes internos nem a chave", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "chave-que-nao-pode-vazar");
    vi.stubEnv("JEV_API_URL", "https://jev.invalid/v1/systemone");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom chave-que-nao-pode-vazar"));
    const res = await post({ theme: "data centers" });
    const text = await res.text();
    expect(res.status).toBe(502);
    expect(text).toContain("Não foi possível concluir esta análise. Tente novamente.");
    expect(text).not.toContain("chave-que-nao-pode-vazar");
    expect(text).not.toContain("jev.invalid");
  });

  it("sem chave configurada também devolve erro amigável", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post({ theme: "café" });
    expect(res.status).toBe(502);
  });
});
