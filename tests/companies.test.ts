import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  UNDISCLOSED_NAME,
  loadCompanies,
  parseCompaniesCsv,
  parseCsv,
} from "@/lib/companies";

const csvPath = path.join(process.cwd(), "data", "exame_maiores_2026_1000_empresas.csv");

describe("parseCsv", () => {
  it("trata aspas, vírgulas internas, BOM e CRLF", () => {
    const rows = parseCsv('﻿a,b\r\n1,"x, ""y"""\r\n');
    expect(rows).toEqual([["a", "b"], ["1", 'x, "y"']]);
  });
});

describe("base EXAME 2026", () => {
  const companies = loadCompanies();

  it("tem exatamente 1.000 empresas com posições 1…1000 e ids exame2026_NNNN", () => {
    expect(companies).toHaveLength(1000);
    companies.forEach((c, i) => {
      expect(c.rank).toBe(i + 1);
      expect(c.id).toBe(`exame2026_${String(i + 1).padStart(4, "0")}`);
    });
    expect(new Set(companies.map((c) => c.id)).size).toBe(1000);
  });

  it("tem 22 setores e não deduplica nomes repetidos", () => {
    expect(new Set(companies.map((c) => c.sector)).size).toBe(22);
    expect(companies.filter((c) => c.name === "Energisa").length).toBeGreaterThan(1);
  });

  it("preserva valores-fonte (Petrobras, milhares de reais)", () => {
    expect(companies[0]).toMatchObject({
      name: "Petrobras",
      revenue2025ThousandsBRL: 497549000,
      city: "Rio de Janeiro",
      state: "RJ",
      undisclosed: false,
    });
  });

  it("mantém a linha 418 anonimizada sem inventar dados", () => {
    const c = companies[417];
    expect(c).toMatchObject({
      rank: 418,
      name: UNDISCLOSED_NAME,
      undisclosed: true,
      sector: "Tecnologia e Telecomunicações",
      city: null,
      state: null,
      revenue2025ThousandsBRL: null,
      netProfit2025ThousandsBRL: null,
    });
    expect(companies.filter((x) => x.undisclosed)).toHaveLength(1);
  });

  it("aceita receita_2024 vazia como null", () => {
    expect(companies[530].revenue2024ThousandsBRL).toBeNull();
    expect(companies[721].revenue2024ThousandsBRL).toBeNull();
  });
});

describe("validação", () => {
  const text = readFileSync(csvPath, "utf-8");

  it("rejeita base com menos de 1.000 linhas", () => {
    const lines = text.trimEnd().split("\n");
    expect(() => parseCompaniesCsv(lines.slice(0, 900).join("\n"))).toThrow(/1000/);
  });

  it("rejeita posições repetidas", () => {
    const lines = text.trimEnd().split("\n");
    lines[2] = lines[2].replace(/^2,/, "1,");
    expect(() => parseCompaniesCsv(lines.join("\n"))).toThrow(/posicao_receita/);
  });

  it("rejeita coluna ausente", () => {
    expect(() => parseCompaniesCsv("posicao_receita,empresa\n1,A")).toThrow(/Coluna ausente/);
  });
});
