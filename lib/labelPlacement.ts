import type { Rect } from "./sectorLayout";

export interface LabelItem {
  id: string;
  text: string;
  cell: Rect;
}

export interface PlacedLabel extends Rect {
  id: string;
  text: string;
}

const LABEL_HEIGHT = 18;
const CHAR_WIDTH = 6.5;
const H_PADDING = 24;
export const LABEL_MAX_WIDTH = 150;
const OFFSET = 4;

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export function estimateLabelWidth(text: string): number {
  return Math.min(LABEL_MAX_WIDTH, Math.ceil(text.length * CHAR_WIDTH + H_PADDING));
}

/**
 * Posiciona labels em ordem de prioridade (primeiro = mais associada), ao lado,
 * à esquerda, acima ou abaixo da célula. Labels sem espaço livre (sem colidir com
 * outros labels, com células em destaque ou sair do mosaico) são omitidos.
 */
export function placeLabels(
  items: LabelItem[],
  bounds: { width: number; height: number },
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const highlighted = items.map((i) => i.cell);

  for (const item of items) {
    const w = estimateLabelWidth(item.text);
    const h = LABEL_HEIGHT;
    const c = item.cell;
    const candidates: Rect[] = [
      { x: c.x + c.w + OFFSET, y: c.y + c.h / 2 - h / 2, w, h },
      { x: c.x - OFFSET - w, y: c.y + c.h / 2 - h / 2, w, h },
      { x: c.x + c.w / 2 - w / 2, y: c.y - OFFSET - h, w, h },
      { x: c.x + c.w / 2 - w / 2, y: c.y + c.h + OFFSET, w, h },
    ];
    const spot = candidates.find(
      (r) =>
        r.x >= 0 &&
        r.y >= 0 &&
        r.x + r.w <= bounds.width &&
        r.y + r.h <= bounds.height &&
        !placed.some((p) => overlaps(p, r)) &&
        !highlighted.some((cell) => cell !== c && overlaps(cell, r)),
    );
    if (spot) placed.push({ ...spot, id: item.id, text: item.text });
  }
  return placed;
}
