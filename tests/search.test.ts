import { describe, expect, it } from "vitest";
import { loadCompanies } from "@/lib/companies";
import { runSearch } from "@/lib/search";
import { fakeScore, mockConfig, noSleep, okResponse } from "./helpers";

const companies = loadCompanies();

describe("runSearch", () => {
  const sent: string[] = [];
  const fetchImpl = (async (_u: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    sent.push(...Object.keys(body.questions));
    return okResponse(Object.keys(body.questions));
  }) as unknown as typeof fetch;

  it("avalia 999 empresas, nunca envia a linha 418 e devolve 1.000 células", async () => {
    const res = await runSearch("data centers", companies, mockConfig(fetchImpl), { sleep: noSleep });
    expect(sent).toHaveLength(999);
    expect(sent).not.toContain("e0418");
    expect(res.results).toHaveLength(1000);
    expect(res.results.map((r) => r.rank)).toEqual(Array.from({ length: 1000 }, (_, i) => i + 1));

    const row418 = res.results[417];
    expect(row418).toMatchObject({ company: "Empresa não divulgada", associationScore: null });
    expect(res.results.filter((r) => r.associationScore === null)).toHaveLength(1);
    expect(res.results[0].associationScore).toBe(fakeScore("e0001"));
    expect(res.results[999].associationScore).toBe(fakeScore("e1000"));
  });

  it("devolve tema, pergunta, model e elapsedMs", async () => {
    const res = await runSearch("data centers", companies, mockConfig(fetchImpl), { sleep: noSleep });
    expect(res).toMatchObject({ theme: "data centers", cached: false, model: "jev-test" });
    expect(res.question).toBe(
      "Quais das 1.000 maiores empresas do Brasil participam de forma economicamente relevante do mercado, da cadeia de valor ou do ecossistema relacionado a “data centers”?",
    );
    expect(res.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
