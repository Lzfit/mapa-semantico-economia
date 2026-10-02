import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompanyTooltip } from "@/components/CompanyTooltip";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ModelQuestion } from "@/components/ModelQuestion";
import { loadCompanies } from "@/lib/companies";
import { formatRevenue } from "@/lib/formatters";
import { MESSAGES, modelQuestion, parseLang, SECTOR_EN, sectorName, urlForLang } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";
import { buildModelQuestion } from "@/lib/question";
import { cacheKeyFor } from "@/lib/searchCache";
import { computeLayout, configForWidth } from "@/lib/sectorLayout";

const companies = loadCompanies();
const inLang = (lang: Lang, el: React.ReactElement) =>
  renderToStaticMarkup(
    createElement(LanguageProvider, { initialLang: lang } as Parameters<typeof LanguageProvider>[0], el),
  );

describe("idioma pela URL", () => {
  it("sem parâmetro = PT; ?lang=en = EN; ?lang=pt ou valor desconhecido = PT", () => {
    expect(parseLang(undefined)).toBe("pt");
    expect(parseLang(null)).toBe("pt");
    expect(parseLang("en")).toBe("en");
    expect(parseLang("pt")).toBe("pt");
    expect(parseLang("fr")).toBe("pt");
    expect(parseLang(["en", "pt"])).toBe("en");
  });

  it("toggle: EN grava lang=en; PT remove o parâmetro; demais parâmetros e hash ficam", () => {
    expect(urlForLang("http://x/", "en")).toBe("/?lang=en");
    expect(urlForLang("http://x/?lang=en", "pt")).toBe("/");
    expect(urlForLang("http://x/?lang=pt", "en")).toBe("/?lang=en");
    expect(urlForLang("http://x/?a=1&lang=en#m", "pt")).toBe("/?a=1#m");
  });
});

describe("dicionário", () => {
  it("PT e EN têm as mesmas chaves", () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        v && typeof v === "object" ? keys(v).map((s) => `${k}.${s}`) : [k],
      );
    expect(keys(MESSAGES.en)).toEqual(keys(MESSAGES.pt));
  });

  it("textos principais nos dois idiomas", () => {
    expect(MESSAGES.pt.title).toBe("Mapa Semântico da Economia Brasileira");
    expect(MESSAGES.en.title).toBe("Semantic Map of the Brazilian Economy");
    expect(MESSAGES.en.subtitle).toBe("Enter a topic and see which parts of Brazil’s economy light up.");
    expect(MESSAGES.en.search.placeholder).toBe("Enter a topic");
    expect(MESSAGES.en.question.heading).toBe("QUESTION FOR THE MODEL");
    expect(MESSAGES.en.legend).toEqual({ lower: "Lower association", higher: "Higher association" });
    expect(MESSAGES.en.ranking.heading).toBe("MOST ASSOCIATED");
    expect(MESSAGES.en.ranking.empty).toBe("The companies most associated with the topic will appear here.");
  });
});

describe("pergunta dinâmica", () => {
  it("PT e EN, com o tema sem tradução", () => {
    expect(modelQuestion("café", "pt")).toBe(
      "Quais das 1.000 maiores empresas do Brasil participam de forma economicamente relevante do mercado, da cadeia de valor ou do ecossistema relacionado a “café”?",
    );
    expect(modelQuestion("café", "en")).toBe(
      "Which of Brazil’s 1,000 largest companies participate in an economically relevant way in the market, value chain or ecosystem related to “café”?",
    );
  });

  it("componente renderiza o texto completo; a pergunta da API segue em PT", () => {
    const text = (lang: Lang) =>
      inLang(lang, createElement(ModelQuestion, { theme: "data centers" }))
        .replace(/<[^>]+>/g, "")
        .replace(MESSAGES[lang].question.heading, "");
    expect(text("pt")).toBe(modelQuestion("data centers", "pt"));
    expect(text("en")).toBe(modelQuestion("data centers", "en"));
    expect(buildModelQuestion("x")).toBe(modelQuestion("x", "pt"));
  });
});

describe("setores", () => {
  const sectors = [...new Set(companies.map((c) => c.sector))];

  it("os 22 setores da base têm tradução explícita, sem duplicatas", () => {
    expect(sectors).toHaveLength(22);
    expect(Object.keys(SECTOR_EN).sort()).toEqual([...sectors].sort());
    expect(new Set(Object.values(SECTOR_EN)).size).toBe(22);
  });

  it("PT mostra o valor original; EN o mapeado; o dado não muda", () => {
    expect(sectorName("Bancos", "pt")).toBe("Bancos");
    expect(sectorName("Bancos", "en")).toBe("Banking");
    expect(sectorName("Tecnologia e Telecomunicações", "en")).toBe("Technology and Telecommunications");
    expect(companies.some((c) => c.sector === "Bancos")).toBe(true);
  });

  it("geometria do mosaico não depende do idioma (agrupa pelo valor original)", () => {
    const layout = computeLayout(companies, configForWidth(1000, true));
    expect(layout.panels.every((p) => p.sector in SECTOR_EN)).toBe(true);
  });
});

describe("tooltip", () => {
  const company = companies.find((c) => c.sector === "Tecnologia e Telecomunicações" && c.city)!;
  const render = (lang: Lang) =>
    inLang(lang, createElement(CompanyTooltip, { company, score: 0.65, left: 0, top: 0 }));

  it("PT", () => {
    const out = render("pt");
    expect(out).toContain(company.name);
    expect(out).toContain("65% de associação");
    expect(out).toContain(">Tecnologia e Telecomunicações<");
    expect(out).toContain(`#${company.rank} no ranking EXAME`);
    expect(out).toContain(`${company.city}, ${company.state}`);
    expect(out).toMatch(/Receita 2025: R\$ [\d.]+,\d bi/);
  });

  it("EN: nome, cidade/UF e reais originais", () => {
    const out = render("en");
    expect(out).toContain(company.name);
    expect(out).toContain("65% association");
    expect(out).toContain(">Technology and Telecommunications<");
    expect(out).toContain(`#${company.rank} in the EXAME ranking`);
    expect(out).toContain(`${company.city}, ${company.state}`);
    expect(out).toMatch(/2025 revenue: R\$ [\d,]+\.\dB/);
  });

  it("empresa não divulgada nos dois idiomas", () => {
    const hidden = companies.find((c) => c.undisclosed)!;
    const t = (lang: Lang) =>
      inLang(lang, createElement(CompanyTooltip, { company: hidden, score: null, left: 0, top: 0 }));
    expect(t("pt")).toContain("Empresa não divulgada pela fonte");
    expect(t("en")).toContain("Company not disclosed by the source");
    expect(t("en")).toContain("Association not calculated");
  });
});

describe("formatação monetária", () => {
  it("PT usa convenções brasileiras; EN inglesas; sempre em reais", () => {
    expect(formatRevenue(5_400_000, "pt")).toBe("R$ 5,4 bi");
    expect(formatRevenue(5_400_000, "en")).toBe("R$ 5.4B");
    expect(formatRevenue(1_234_500_000, "pt")).toBe("R$ 1.234,5 bi");
    expect(formatRevenue(1_234_500_000, "en")).toBe("R$ 1,234.5B");
    expect(formatRevenue(562_238, "en")).toBe("R$ 0.6B");
  });
});

describe("cache independe do idioma", () => {
  it("a chave depende só da query", () => {
    expect(cacheKeyFor.length).toBe(1);
    expect(cacheKeyFor("Café")).toBe("jev-search:v1:café");
  });
});
