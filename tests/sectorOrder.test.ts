import { describe, expect, it } from "vitest";
import { loadCompanies } from "@/lib/companies";
import { computeLayout, configForWidth, groupBySector } from "@/lib/sectorLayout";
import { activationSectorOrder, MOBILE_TOP_SECTORS, sectorActivation } from "@/lib/sectorOrder";

const companies = loadCompanies();
const groups = groupBySector(companies);
const fixed = groups.map(([s]) => s);

describe("sectorActivation", () => {
  it("70% da média do quartil superior + 30% da média do setor", () => {
    // 8 empresas: quartil superior = 2, mas o mínimo é 3 → [1, 0.8, 0.6]
    const s = [1, 0.8, 0.6, 0.4, 0.2, 0, 0, 0];
    expect(sectorActivation(s)).toBeCloseTo(0.7 * 0.8 + 0.3 * 0.375, 10);
  });

  it("quartil superior arredonda para cima em setores grandes", () => {
    const s = Array.from({ length: 13 }, (_, i) => (i < 4 ? 1 : 0)); // ceil(13 × 0,25) = 4
    expect(sectorActivation(s)).toBeCloseTo(0.7 * 1 + 0.3 * (4 / 13), 10);
  });

  it("ignora quem não tem score e usa todas quando o setor tem menos de 3", () => {
    expect(sectorActivation([0.5, null, 0.3])).toBeCloseTo(0.7 * 0.4 + 0.3 * 0.4, 10);
    expect(sectorActivation([null])).toBeNull();
  });

  it("uma empresa isolada não domina um setor grande", () => {
    const lone = [1, ...Array(40).fill(0)];
    const broad = Array(10).fill(0.6);
    expect(sectorActivation(broad)!).toBeGreaterThan(sectorActivation(lone)!);
  });
});

describe("activationSectorOrder", () => {
  const scoresFor = (bySector: Record<string, number>, rest = 0.05) =>
    Object.fromEntries(
      companies.map((c) => [c.id, c.undisclosed ? null : (bySector[c.sector] ?? rest)]),
    );

  it("sobe só os 5 setores mais associados; os demais mantêm a ordem fixa", () => {
    const hot = [fixed[20], fixed[3], fixed[15], fixed[9], fixed[0], fixed[7]];
    const scores = scoresFor(Object.fromEntries(hot.map((s, i) => [s, 0.9 - i * 0.1])));
    const order = activationSectorOrder(groups, scores);
    expect(MOBILE_TOP_SECTORS).toBe(5);
    expect(order.slice(0, 5)).toEqual(hot.slice(0, 5));
    const rest = fixed.filter((s) => !hot.slice(0, 5).includes(s));
    expect(order.slice(5)).toEqual(rest);
    expect([...order].sort()).toEqual([...fixed].sort());
  });

  it("empate mantém a ordem fixa", () => {
    const order = activationSectorOrder(groups, scoresFor({}, 0.5));
    expect(order).toEqual(fixed);
  });
});

describe("layout mobile com ordem por associação", () => {
  const cfg = configForWidth(358);
  const hotScores = Object.fromEntries(
    companies.map((c) => [c.id, c.undisclosed ? null : c.sector === fixed[12] ? 0.9 : 0.1]),
  );
  const order = activationSectorOrder(groups, hotScores);
  const sorted = computeLayout(companies, cfg, order);
  const base = computeLayout(companies, cfg);

  it("o setor mais associado vai para o topo, sem mudar células nem a ordem interna", () => {
    expect(sorted.panels[0].sector).toBe(fixed[12]);
    expect(sorted.panels[0].y).toBe(0);
    expect(sorted.height).toBe(base.height);
    for (const p of sorted.panels) {
      const same = base.panels.find((b) => b.sector === p.sector)!;
      expect(p.companies.map((c) => c.id)).toEqual(same.companies.map((c) => c.id));
      expect(p.cols).toBe(same.cols);
      expect(p.height).toBe(same.height);
    }
  });

  it("sem ordem (estado inicial, desktop, tablet) a ordem é a fixa", () => {
    expect(base.panels.map((p) => p.sector)).toEqual(fixed);
    expect(computeLayout(companies, cfg, null)).toEqual(base);
  });
});

describe("célula mobile", () => {
  it("~30 colunas e célula crescendo com a largura, de 9px até o limite", () => {
    expect(configForWidth(358).cell).toBe(9);
    expect(configForWidth(398).cell).toBe(10);
    expect(configForWidth(501).cell).toBe(13);
    expect(configForWidth(320).cell).toBe(9);
    for (const w of [320, 358, 398, 450, 501, 600]) {
      const cfg = configForWidth(w);
      expect(cfg.minPanelWidth).toBe(w);
      expect(cfg.cell).toBeLessThanOrEqual(14);
    }
  });
});

describe("blocos mobile", () => {
  it("cabeçalho do mapa: dica no inicial; legenda e nota de ordenação com resultado, sem expor score", async () => {
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { MobileMapHeading } = await import("@/components/MobileBlocks");
    const initial = renderToStaticMarkup(createElement(MobileMapHeading, { hasResult: false }));
    const result = renderToStaticMarkup(createElement(MobileMapHeading, { hasResult: true }));
    expect(initial).toContain("cada quadrado é uma empresa");
    expect(initial).not.toContain("Setores mais associados primeiro");
    expect(result).toContain("Setores mais associados primeiro");
    expect(result.replace(/<[^>]*>/g, "")).not.toMatch(/\d/);
  });
});
