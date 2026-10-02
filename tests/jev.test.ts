import { describe, expect, it } from "vitest";
import { loadCompanies } from "@/lib/companies";
import { buildCompanyContext, buildQuestion, questionId, readJevConfig } from "@/lib/jev";
import type { Company } from "@/types/company";

const companies = loadCompanies();

describe("buildCompanyContext", () => {
  it("monta empresa + setor + cidade + UF só com dados da EXAME", () => {
    const weg = companies.find((c) => c.name === "Weg")!;
    expect(buildCompanyContext(weg)).toBe(
      `Weg — empresa atuante no Brasil no setor ${weg.sector}, sediada em ${weg.city}, ${weg.state}`,
    );
  });

  it("omite cidade ou UF ausentes sem inventar", () => {
    const base = companies[0];
    const semUf = { ...base, state: null } as Company;
    const semCidade = { ...base, city: null } as Company;
    const semAmbos = { ...base, city: null, state: null } as Company;
    expect(buildCompanyContext(semUf)).toMatch(/sediada em Rio de Janeiro$/);
    expect(buildCompanyContext(semCidade)).toMatch(/sediada em RJ$/);
    expect(buildCompanyContext(semAmbos)).toBe(
      `Petrobras — empresa atuante no Brasil no setor ${base.sector}`,
    );
  });
});

describe("buildQuestion", () => {
  it("usa o prompt noul da SPEC §22", () => {
    const q = buildQuestion("Atlas — empresa atuante no Brasil no setor Atacado e Varejo, sediada em Esteio, RS");
    expect(q.type).toBe("noul");
    expect(q.instructions).toBe(
      'Um analista de mercado incluiria a empresa "Atlas — empresa atuante no Brasil no setor Atacado e Varejo, sediada em Esteio, RS" ' +
        "entre as empresas que participam de forma economicamente relevante " +
        "do mercado, cadeia de valor ou ecossistema relacionado ao tema " +
        "descrito no state?",
    );
    expect(q.criteria.true).toMatch(/^A empresa possui relação empresarial específica e relevante/);
    expect(q.criteria.false).toMatch(/^A empresa é apenas usuária, cliente ou beneficiária genérica/);
  });
});

describe("questionId", () => {
  it("segue posicao_receita: e0001 … e1000", () => {
    expect(questionId(1)).toBe("e0001");
    expect(questionId(418)).toBe("e0418");
    expect(questionId(1000)).toBe("e1000");
  });
});

describe("readJevConfig", () => {
  it("falha sem chave e usa padrões com chave", () => {
    expect(() => readJevConfig({} as NodeJS.ProcessEnv)).toThrow();
    const cfg = readJevConfig({ TYPESAFE_API_KEY: "k" } as unknown as NodeJS.ProcessEnv);
    expect(cfg).toMatchObject({
      model: "jev-latest",
      batchSize: 250,
      endpoint: "https://api.typesafe.ai/v1/systemone",
    });
  });
});
