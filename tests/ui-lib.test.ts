import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatPercent, formatRevenueBi } from "@/lib/formatters";
import { estimateLabelWidth, placeLabels } from "@/lib/labelPlacement";
import { topAssociated } from "@/lib/ranking";
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
  const cell = (x: number, y: number) => ({ x, y, w: 12, h: 12 });

  it("coloca ao lado da célula e evita colisão entre labels", () => {
    const placed = placeLabels(
      [
        { id: "a", text: "Vivo", cell: cell(100, 100) },
        { id: "b", text: "Weg", cell: cell(120, 100) },
      ],
      { width: 1000, height: 600 },
    );
    expect(placed).toHaveLength(2);
    const [a, b] = placed;
    const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    expect(overlap).toBe(false);
  });

  it("omite o label de menor prioridade quando não há espaço", () => {
    const placed = placeLabels(
      [
        { id: "a", text: "Vivo", cell: cell(0, 0) },
        { id: "b", text: "Weg", cell: cell(0, 0) },
      ],
      { width: estimateLabelWidth("Vivo") + 20, height: 14 },
    );
    expect(placed.map((p) => p.id)).toEqual([]);
  });

  it("nunca sai do mosaico", () => {
    const placed = placeLabels([{ id: "a", text: "Empresa Longa SA", cell: cell(990, 590) }], {
      width: 1000,
      height: 600,
    });
    for (const p of placed) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x + p.w).toBeLessThanOrEqual(1000);
      expect(p.y + p.h).toBeLessThanOrEqual(600);
    }
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
