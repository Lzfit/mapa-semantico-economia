import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AssociationRanking } from "@/components/AssociationRanking";
import { MapExperience } from "@/components/MapExperience";
import { ModelQuestion } from "@/components/ModelQuestion";
import { loadCompanies } from "@/lib/companies";
import { readFileSync } from "node:fs";
import { useIsTabletShort } from "@/lib/useIsMobile";

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

describe("marca do header", () => {
  it("é um SVG decorativo com três barras de alturas crescentes, antes do título", () => {
    const header = html.match(/<header[\s\S]*?<\/header>/)![0];
    const svg = header.match(/<svg[\s\S]*?<\/svg>/)![0];
    const heights = [...svg.matchAll(/<rect[^>]*height="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(heights).toHaveLength(3);
    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);
    expect(svg).toContain("rx=");
    expect(header.indexOf("<svg")).toBeLessThan(header.indexOf("<h1"));
    expect(header).toContain('aria-hidden="true"');
    expect(header).not.toContain("<a ");
    // Os únicos botões do header são os do seletor de idioma.
    const brand = header.slice(0, header.indexOf("<h1"));
    expect(brand).not.toContain("<button");
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

describe("breakpoint de tablet largo com pouca altura", () => {
  it("oculta só o heading da pergunta (continua para leitores de tela) e mantém o texto", () => {
    const out = renderToStaticMarkup(createElement(ModelQuestion, { theme: "café" }));
    expect(out).toMatch(/<h2[^>]*tshort:sr-only[^>]*>PERGUNTA AO MODELO<\/h2>/);
    expect(out).toContain("Quais das 1.000 maiores empresas do Brasil participam de forma");
    expect(out).toContain("“café”");
  });

  it("o variante CSS e o hook usam a mesma faixa: 768–1023px de largura e até 760px de altura", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const query = "(min-width: 768px) and (max-width: 1023px) and (max-height: 760px)";
    expect(css).toContain(`@custom-variant tshort (@media ${query});`);
    expect(useIsTabletShort.toString()).toContain(query);
  });
});
