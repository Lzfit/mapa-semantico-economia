import { describe, expect, it } from "vitest";
import { chunk, evaluateAll } from "@/lib/batching";
import { buildQuestion } from "@/lib/jev";
import { maxTokensResponse, mockConfig, noSleep, okResponse } from "./helpers";
import type { Call } from "./helpers";

const entries = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `e${String(i + 1).padStart(4, "0")}`,
    question: buildQuestion(`Empresa ${i + 1}`),
  }));

function recorder(handler: (call: Call, n: number) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const call: Call = {
      ids: Object.keys(body.questions),
      body,
      headers: init.headers as Record<string, string>,
    };
    calls.push(call);
    return handler(call, calls.length);
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

describe("chunk", () => {
  it("999 itens em batches de 250 → 250/250/250/249", () => {
    expect(chunk(entries(999), 250).map((b) => b.length)).toEqual([250, 250, 250, 249]);
  });
});

describe("evaluateAll", () => {
  it("dispara 4 batches em paralelo e junta 999 scores", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const { calls, fetchImpl } = recorder(async (call) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return okResponse(call.ids);
    });
    const res = await evaluateAll("data centers", entries(999), mockConfig(fetchImpl), { sleep: noSleep });
    expect(calls.map((c) => c.ids.length).sort()).toEqual([249, 250, 250, 250]);
    expect(maxInFlight).toBe(4);
    expect(Object.keys(res.scores)).toHaveLength(999);
    expect(calls[0].body.state).toEqual({ tema: "data centers" });
    expect(calls[0].body.model).toBe("jev-latest");
    expect(calls[0].headers.Authorization).toBe("Bearer chave-de-teste-secreta");
  });

  it("em max_tokens_exceeded divide só o batch que falhou (250 → 125 + 125)", async () => {
    const { calls, fetchImpl } = recorder((call) =>
      call.ids.includes("e0001") && call.ids.length === 250
        ? maxTokensResponse()
        : okResponse(call.ids),
    );
    const res = await evaluateAll("café", entries(999), mockConfig(fetchImpl), { sleep: noSleep });
    // 4 chamadas originais + 2 metades do batch que falhou; os outros 3 não são refeitos
    const sizes = calls.map((c) => c.ids.length).sort((x, y) => x - y);
    expect(sizes).toEqual([125, 125, 249, 250, 250, 250]);
    expect(Object.keys(res.scores)).toHaveLength(999);
  });

  it("repete até 2 vezes em 5xx/429 e depois aceita o sucesso", async () => {
    let n = 0;
    const { calls, fetchImpl } = recorder((call) => {
      n++;
      if (n === 1) return new Response("x", { status: 500 });
      if (n === 2) return new Response("x", { status: 429 });
      return okResponse(call.ids);
    });
    const res = await evaluateAll("seca", entries(10), mockConfig(fetchImpl), { sleep: noSleep });
    expect(calls).toHaveLength(3);
    expect(Object.keys(res.scores)).toHaveLength(10);
  });

  it("desiste após 2 retries e nunca devolve resultado parcial", async () => {
    const { calls, fetchImpl } = recorder(() => new Response("x", { status: 503 }));
    await expect(
      evaluateAll("seca", entries(10), mockConfig(fetchImpl), { sleep: noSleep }),
    ).rejects.toThrow();
    expect(calls).toHaveLength(3);
  });

  it("falha tudo se um batch falha, mesmo que os outros tenham dado certo", async () => {
    const { fetchImpl } = recorder((call) =>
      call.ids.includes("e0600") ? new Response("x", { status: 502 }) : okResponse(call.ids),
    );
    await expect(
      evaluateAll("aviação", entries(999), mockConfig(fetchImpl), { sleep: noSleep }),
    ).rejects.toThrow();
  });

  it("não repete erro 4xx semântico", async () => {
    const { calls, fetchImpl } = recorder(() => Response.json({ detail: "x" }, { status: 422 }));
    await expect(
      evaluateAll("x", entries(5), mockConfig(fetchImpl), { sleep: noSleep }),
    ).rejects.toThrow();
    expect(calls).toHaveLength(1);
  });

  it("rejeita score ausente ou fora de 0–1 em vez de assumir zero", async () => {
    const { fetchImpl } = recorder((call) =>
      Response.json({ answers: Object.fromEntries(call.ids.map((id) => [id, { noul: 1.5 }])) }),
    );
    await expect(
      evaluateAll("x", entries(5), mockConfig(fetchImpl), { sleep: noSleep }),
    ).rejects.toThrow(/inválido/);
    const missing = recorder((call) => Response.json({ answers: { [call.ids[0]]: { noul: 0.4 } } }));
    await expect(
      evaluateAll("x", entries(5), mockConfig(missing.fetchImpl), { sleep: noSleep }),
    ).rejects.toThrow();
  });
});
