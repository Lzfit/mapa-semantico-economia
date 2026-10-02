import type { Company } from "@/types/company";

export interface LayoutConfig {
  /** Largura disponível para o mosaico, em px. */
  width: number;
  /** Lado da célula, em px (igual para as 1.000 empresas). */
  cell: number;
  gap: number;
  panelPadding: number;
  panelGap: number;
  /** Altura reservada ao nome do setor dentro do painel. */
  headerHeight: number;
  /** Largura mínima do painel, para o nome do setor caber. */
  minPanelWidth: number;
}

export interface PanelLayout {
  sector: string;
  companies: Company[];
  cols: number;
  rows: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MosaicLayout {
  panels: PanelLayout[];
  width: number;
  height: number;
  config: LayoutConfig;
}

export function configForWidth(width: number): LayoutConfig {
  const mobile = width < 640;
  const cell = mobile ? 9 : width < 900 ? 11 : 12;
  return {
    width,
    cell,
    gap: mobile ? 2 : 3,
    panelPadding: mobile ? 12 : 16,
    panelGap: mobile ? 6 : 8,
    headerHeight: 32,
    minPanelWidth: mobile ? width : width < 1000 ? 175 : 150,
  };
}

/** Agrupa por setor; ordem dos setores fixa (mais empresas primeiro, depois nome) e empresas por receita. */
export function groupBySector(companies: Company[]): Array<[string, Company[]]> {
  const map = new Map<string, Company[]>();
  for (const c of companies) {
    const list = map.get(c.sector);
    if (list) list.push(c);
    else map.set(c.sector, [c]);
  }
  const groups = [...map.entries()];
  for (const [, list] of groups) list.sort((a, b) => a.rank - b.rank);
  groups.sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "pt-BR"),
  );
  return groups;
}

interface Slot {
  sector: string;
  companies: Company[];
  cols: number;
  minWidth: number;
}

function packShelves(
  groups: Array<[string, Company[]]>,
  rowsPerShelf: number,
  cfg: LayoutConfig,
): { shelves: Slot[][]; height: number } {
  const pitch = cfg.cell + cfg.gap;
  const pad = cfg.panelPadding * 2;
  const minCols = Math.max(1, Math.ceil((cfg.minPanelWidth - pad + cfg.gap) / pitch));
  const maxCols = Math.max(1, Math.floor((cfg.width - pad + cfg.gap) / pitch));
  const shelves: Slot[][] = [];
  let cur: Slot[] = [];
  let used = 0;

  for (const [sector, companies] of groups) {
    const cols = Math.min(
      maxCols,
      Math.max(minCols, Math.ceil(companies.length / rowsPerShelf)),
    );
    const minWidth = cols * pitch - cfg.gap + pad;
    const need = cur.length ? cfg.panelGap + minWidth : minWidth;
    if (cur.length && used + need > cfg.width) {
      shelves.push(cur);
      cur = [];
      used = 0;
    }
    cur.push({ sector, companies, cols, minWidth });
    used += cur.length > 1 ? cfg.panelGap + minWidth : minWidth;
  }
  if (cur.length) shelves.push(cur);

  let height = 0;
  for (const shelf of shelves) height += shelfHeight(shelf, cfg);
  height += cfg.panelGap * (shelves.length - 1);
  return { shelves, height };
}

function shelfHeight(shelf: Slot[], cfg: LayoutConfig): number {
  const rows = Math.max(...shelf.map((s) => Math.ceil(s.companies.length / s.cols)));
  return (
    cfg.panelPadding * 2 +
    cfg.headerHeight +
    rows * cfg.cell +
    (rows - 1) * cfg.gap
  );
}

/**
 * Layout determinístico em "prateleiras": painéis de setor lado a lado, todos
 * com a mesma altura de grade na prateleira. A busca nunca participa do cálculo.
 */
export function computeLayout(
  companies: Company[],
  cfg: LayoutConfig,
): MosaicLayout {
  const groups = groupBySector(companies);
  let best: ReturnType<typeof packShelves> | null = null;
  for (let r = 3; r <= 40; r++) {
    const candidate = packShelves(groups, r, cfg);
    if (!best || candidate.height < best.height) best = candidate;
  }
  const { shelves, height } = best!;

  const panels: PanelLayout[] = [];
  let y = 0;
  for (const shelf of shelves) {
    const h = shelfHeight(shelf, cfg);
    const minTotal =
      shelf.reduce((s, p) => s + p.minWidth, 0) + cfg.panelGap * (shelf.length - 1);
    const slack = Math.max(0, cfg.width - minTotal);
    // sobra distribuída em largura do painel, nunca no tamanho da célula
    let x = 0;
    shelf.forEach((slot, i) => {
      const isLast = i === shelf.length - 1;
      const extra = isLast
        ? cfg.width - x - slot.minWidth
        : Math.floor((slack * slot.minWidth) / (minTotal - cfg.panelGap * (shelf.length - 1)));
      const width = slot.minWidth + Math.max(0, extra);
      panels.push({
        sector: slot.sector,
        companies: slot.companies,
        cols: slot.cols,
        rows: Math.ceil(slot.companies.length / slot.cols),
        x,
        y,
        width,
        height: h,
      });
      x += width + cfg.panelGap;
    });
    y += h + cfg.panelGap;
  }
  return { panels, width: cfg.width, height, config: cfg };
}
