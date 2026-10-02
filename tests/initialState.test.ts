import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssociationRanking } from "@/components/AssociationRanking";
import { MapExperience } from "@/components/MapExperience";
import { ModelQuestion } from "@/components/ModelQuestion";
import { loadCompanies } from "@/lib/companies";
import { readFileSync } from "node:fs";

const companies = loadCompanies();
const html = renderToStaticMarkup(createElement(MapExperience, { companies }));

describe("estado inicial da experiência", () => {
  it("abre com a busca vazia e o placeholder simples", () => {
    const input = html.match(/<input[^>]*>/)![0];
    expect(input).toContain('placeholder="Digite um tema"');
    expect(input).not.toMatch(/value="[^"]+"/);
    expect(html).not.toContain("data centers");
  });

  it("não mostra a seção PERGUNTA AO MODELO nem pergunta fictícia", () => {
    expect(html).not.toContain("PERGUNTA AO MODELO");
    expect(html).not.toContain("Quais das 1.000 maiores empresas");
  });

  it("não tem o link Como funciona nem âncora associada", () => {
    expect(html).not.toContain("Como funciona");
    expect(html).not.toContain("como-funciona");
  });

  it("mosaico neutro: 1.000 células, nenhuma destacada, nenhum label; ranking só com mensagem discreta", () => {
    expect(html.match(/data-company-id=/g)).toHaveLength(1000);
    expect(html).not.toContain("1.5px rgba(32, 40, 32, 0.75)"); // anel de destaque
    expect(html).not.toContain("pointer-events-none absolute z-10"); // labels de empresa
    expect(html).toContain("As empresas mais associadas ao tema aparecerão aqui.");
    expect(html).not.toContain('aria-busy="true"');
    expect(html).not.toContain("<ol");
  });

  it("sem chamada ao Jev no carregamento: sem efeito de busca inicial, sem persistência local", () => {
    const src = readFileSync("components/MapExperience.tsx", "utf8");
    expect(src).not.toContain("useEffect");
    expect(src).not.toMatch(/localStorage|sessionStorage|location\.(hash|search)|history\./);
  });
});

describe("depois da primeira busca", () => {
  it("a pergunta aparece com o tema pesquisado", () => {
    const out = renderToStaticMarkup(createElement(ModelQuestion, { theme: "café" }));
    expect(out).toContain("PERGUNTA AO MODELO");
    expect(out).toContain("“café”");
  });

  it("o ranking com resultados continua igual", () => {
    const out = renderToStaticMarkup(
      createElement(AssociationRanking, {
        items: [{ id: "1", company: "Empresa A", associationScore: 0.92 }] as never,
        loading: false,
      }),
    );
    expect(out).toContain("Empresa A");
    expect(out).toContain("<ol");
    expect(out).not.toContain("aparecerão aqui");
  });
});
