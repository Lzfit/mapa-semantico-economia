import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatPercent, formatRevenueBi } from "@/lib/formatters";
import { loadCompanies } from "@/lib/companies";
import { estimateLabelWidth, placeLabels } from "@/lib/labelPlacement";
import { cellRect, computeLayout, configForWidth, titleRect } from "@/lib/sectorLayout";
import type { Rect } from "@/lib/sectorLayout";
import { rankingLimit, topAssociated } from "@/lib/ranking";
import type { SearchResult } from "@/types/api";

const r = (rank: number, associationScore: number | null): SearchResult => ({
  id: `exame2026_${rank}`,
  rank,
  company: `Emp ${rank}`,
  sector: "S",
  city: null,
  state: null,
  revenue2025ThousandsBRL: null,
  associationScore,
});

describe("topAssociated", () => {
  it("ordena por score desc, desempata por melhor posição e ignora sem score", () => {
    const top = topAssociated([r(5, 0.7), r(2, 0.7), r(1, null), r(9, 0.9), r(3, 0.1)], 3);
    expect(top.map((x) => x.rank)).toEqual([9, 2, 5]);
  });
});

describe("formatters", () => {
  it("arredonda percentual e converte milhares de reais em bilhões", () => {
    expect(formatPercent(0.743)).toBe("74%");
    expect(formatPercent(0.745)).toBe("75%");
    expect(formatRevenueBi(497549000)).toBe("R$ 497,5 bi");
    expect(formatRevenueBi(562238)).toBe("R$ 0,6 bi");
  });
});

describe("placeLabels", () => {
  const cell = (x: number, y: number) => ({ x, y, w: 11, h: 11 });
  const big = { width: 1000, height: 600 };

  it("cola o label na célula, sem conector, quando há espaço", () => {
    const [a] = placeLabels([{ id: "a", text: "Vivo", cell: cell(100, 100) }], big);
    expect(a.connector).toBeUndefined();
    expect(a.x).toBe(100 + 11 + 4); // à direita da célula
  });

  it("é determinístico", () => {
    const items = [
      { id: "a", text: "Vivo", cell: cell(100, 100) },
      { id: "b", text: "Weg", cell: cell(115, 100) },
      { id: "c", text: "TIM", cell: cell(130, 100) },
    ];
    expect(placeLabels(items, big)).toEqual(placeLabels(items, big));
  });

  it("dá a posição mais próxima ao de maior prioridade", () => {
    const items = [
      { id: "a", text: "Alta prioridade", cell: cell(100, 100) },
      { id: "b", text: "Baixa", cell: cell(100, 100 + 14) },
    ];
    const [a, b] = placeLabels(items, big);
    expect(a.x).toBe(100 + 11 + 4);
    expect(b).toBeDefined();
    expect(overlapsRect(a, b)).toBe(false);
  });

  it("omite o de menor prioridade quando não há posição limpa", () => {
    const placed = placeLabels(
      [
        { id: "a", text: "Vivo", cell: cell(0, 0) },
        { id: "b", text: "Weg", cell: cell(0, 0) },
      ],
      { width: estimateLabelWidth("Vivo") + 8, height: 14 },
    );
    expect(placed.map((p) => p.id)).toEqual([]);
  });

  it("não cobre títulos de setor (obstáculos) nem sai do mosaico", () => {
    const title = { x: 90, y: 60, w: 200, h: 24 };
    const placed = placeLabels(
      [{ id: "a", text: "Empresa Longa SA", cell: cell(120, 86) }],
      big,
      [title],
    );
    for (const p of placed) {
      expect(overlapsRect(p, title)).toBe(false);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(big.width);
      expect(p.y + p.h).toBeLessThanOrEqual(big.height);
    }
  });
});

function overlapsRect(a: Rect, b: Rect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe("placeLabels com o mosaico real", () => {
  const companies = loadCompanies();
  const sectors = [...new Set(companies.map((c) => c.sector))];
  const hash = (s: string) => {
    let h = 2166136261;
    for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return (h >>> 0) / 0xffffffff;
  };

  const cases = [
    [592, true, false, false], [848, true, false, false], [1008, true, false, false],
    [848, true, true, false], [900, false, false, false], [360, false, false, false],
    [709, false, false, true], [688, false, false, true], [754, false, false, true],
  ] as const;

  it.each(cases)("respeita todas as regras (largura %i, compacto %s, baixo %s, tablet baixo %s)", (width, compact, short, tabletShort) => {
    const cfg = configForWidth(width, compact, short, tabletShort);
    const layout = computeLayout(companies, cfg);
    const rects = new Map<string, Rect>();
    layout.panels.forEach((p) => p.companies.forEach((c, i) => rects.set(c.id, cellRect(p, i, cfg))));
    const titles = layout.panels.map((p) => titleRect(p, cfg));
    const bounds = { width: layout.width, height: layout.height };
    let connectors = 0;

    // temas espalhados (top 8 global) e concentrados (top 8 dentro de um setor, o pior caso)
    const themes: Array<ReturnType<typeof topFor>> = [];
    function topFor(theme: string, sector?: string) {
      return companies
        .filter((c) => !c.undisclosed && (!sector || c.sector === sector))
        .map((c) => ({ c, s: hash(theme + c.id) }))
        .sort((a, b) => b.s - a.s || a.c.rank - b.c.rank)
        .slice(0, 8)
        .map(({ c }) => ({ id: c.id, text: c.name, cell: rects.get(c.id)! }));
    }
    for (const t of ["data centers", "macarrão", "café", "seca", "aviação", "celulose"]) themes.push(topFor(t));
    for (let i = 0; i < 40; i++) themes.push(topFor(`t${i}`, sectors[Math.floor(hash(`s${i}`) * sectors.length)]));

    for (const top of themes) {
      const placed = placeLabels(top, bounds, titles);
      expect(placeLabels(top, bounds, titles)).toEqual(placed); // determinístico

      placed.forEach((l, i) => {
        expect(l.x).toBeGreaterThanOrEqual(0);
        expect(l.y).toBeGreaterThanOrEqual(0);
        expect(l.x + l.w).toBeLessThanOrEqual(bounds.width);
        expect(l.y + l.h).toBeLessThanOrEqual(bounds.height);
        for (const t of titles) expect(overlapsRect(l, t)).toBe(false);
        for (const other of top) {
          if (other.id !== l.id) expect(overlapsRect(l, other.cell)).toBe(false);
        }
        placed.slice(i + 1).forEach((m) => expect(overlapsRect(l, m)).toBe(false));

        // ancoragem: colado (sem conector) ou conector saindo da própria célula
        const own = top.find((t) => t.id === l.id)!.cell;
        const dx = Math.max(own.x - (l.x + l.w), l.x - (own.x + own.w), 0);
        const dy = Math.max(own.y - (l.y + l.h), l.y - (own.y + own.h), 0);
        if (l.connector) {
          connectors++;
          expect(Math.max(dx, dy)).toBeGreaterThan(4);
          const { x1, y1 } = l.connector;
          expect(x1 >= own.x && x1 <= own.x + own.w && y1 >= own.y && y1 <= own.y + own.h).toBe(true);
        } else {
          expect(Math.max(dx, dy)).toBeLessThanOrEqual(4);
        }
      });

      // prioridade preservada: um label omitido nunca "fura a fila" de um posicionado
      const ids = placed.map((p) => p.id);
      expect(ids).toEqual(top.map((t) => t.id).filter((id) => ids.includes(id)));
    }
    if (width === 1008) expect(connectors).toBeGreaterThan(0);
  });
});

describe("segurança da chave", () => {
  const roots = ["components", "app", "lib", "types"];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(name)) files.push(full);
    }
  };
  roots.forEach((d) => walk(path.join(process.cwd(), d)));

  it("TYPESAFE_API_KEY só é lida em lib/jev.ts", () => {
    const users = files.filter((f) => readFileSync(f, "utf-8").includes("TYPESAFE_API_KEY"));
    expect(users.map((f) => path.relative(process.cwd(), f))).toEqual(["lib/jev.ts"]);
  });

  it("nenhuma variável NEXT_PUBLIC_ e componentes não importam lib/jev", () => {
    for (const f of files) {
      const src = readFileSync(f, "utf-8");
      expect(src).not.toContain("NEXT_PUBLIC_");
      if (f.includes(`${path.sep}components${path.sep}`)) {
        expect(src).not.toMatch(/from "@\/lib\/(jev|batching|search)"/);
      }
    }
  });
});

describe("rankingLimit", () => {
  it("Top 6 no mobile e no tablet largo de pouca altura; Top 8 nos demais", () => {
    expect(rankingLimit(true, false)).toBe(6);
    expect(rankingLimit(false, true)).toBe(6);
    expect(rankingLimit(false, false)).toBe(8);
  });
});
