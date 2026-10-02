import { describe, expect, it } from "vitest";
import { loadCompanies } from "@/lib/companies";
import { computeLayout, configForWidth } from "@/lib/sectorLayout";

const companies = loadCompanies();
const WIDTHS = [360, 600, 800, 1000, 1100];

describe.each(WIDTHS)("layout com largura %ipx", (width) => {
  const cfg = configForWidth(width);
  const layout = computeLayout(companies, cfg);

  it("renderiza as 1.000 empresas exatamente uma vez", () => {
    const ids = layout.panels.flatMap((p) => p.companies.map((c) => c.id));
    expect(ids).toHaveLength(1000);
    expect(new Set(ids).size).toBe(1000);
  });

  it("tem 22 painéis dentro da largura e sem sobreposição", () => {
    expect(layout.panels).toHaveLength(22);
    for (const p of layout.panels) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.width).toBeLessThanOrEqual(width);
      expect(p.y + p.height).toBeLessThanOrEqual(layout.height);
    }
    for (let i = 0; i < layout.panels.length; i++) {
      for (let j = i + 1; j < layout.panels.length; j++) {
        const a = layout.panels[i];
        const b = layout.panels[j];
        const overlap =
          a.x < b.x + b.width && b.x < a.x + a.width &&
          a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap).toBe(false);
      }
    }
  });

  it("cabe a grade de células dentro de cada painel", () => {
    const pitch = cfg.cell + cfg.gap;
    for (const p of layout.panels) {
      const gridW = p.cols * pitch - cfg.gap;
      const gridH = p.rows * pitch - cfg.gap;
      expect(gridW + cfg.panelPadding * 2).toBeLessThanOrEqual(p.width);
      expect(gridH + cfg.panelPadding * 2 + cfg.headerHeight).toBeLessThanOrEqual(p.height);
      expect(p.cols * p.rows).toBeGreaterThanOrEqual(p.companies.length);
    }
  });

  it("ordena cada setor por posicao_receita crescente", () => {
    for (const p of layout.panels) {
      const ranks = p.companies.map((c) => c.rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      expect(p.companies.every((c) => c.sector === p.sector)).toBe(true);
    }
  });

  it("é determinístico", () => {
    expect(computeLayout(companies, cfg)).toEqual(layout);
  });
});

describe("tamanho da célula", () => {
  it("é único por viewport e fica entre 9 e 14px", () => {
    for (const w of WIDTHS) {
      const { cell } = configForWidth(w);
      expect(cell).toBeGreaterThanOrEqual(9);
      expect(cell).toBeLessThanOrEqual(14);
    }
  });
});

describe("desktop", () => {
  it("compacta o mosaico em ~1.000px (altura < 700px)", () => {
    expect(computeLayout(companies, configForWidth(1000)).height).toBeLessThan(700);
  });
});

describe.each([592, 848, 1008])("layout compacto (desktop) com largura %ipx", (width) => {
  const cfg = configForWidth(width, true);
  const layout = computeLayout(companies, cfg);

  it("mantém as 1.000 células iguais, ordem por receita e painéis sem sobreposição", () => {
    expect(cfg.cell).toBe(11);
    expect(layout.panels.flatMap((p) => p.companies)).toHaveLength(1000);
    for (const p of layout.panels) {
      const ranks = p.companies.map((c) => c.rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      expect(p.x + p.width).toBeLessThanOrEqual(width);
    }
    for (let i = 0; i < layout.panels.length; i++) {
      for (let j = i + 1; j < layout.panels.length; j++) {
        const a = layout.panels[i];
        const b = layout.panels[j];
        expect(
          a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height,
        ).toBe(false);
      }
    }
  });

  it("é mais baixo que o layout padrão desktop", () => {
    const normal = computeLayout(companies, configForWidth(width));
    expect(layout.height).toBeLessThan(normal.height);
  });
});

describe("compacto em 1.008px", () => {
  it("fica abaixo de 520px de altura", () => {
    expect(computeLayout(companies, configForWidth(1008, true)).height).toBeLessThan(520);
  });
});
