import type { Rect } from "./sectorLayout";

export interface LabelItem {
  id: string;
  text: string;
  cell: Rect;
}

export interface Connector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PlacedLabel extends Rect {
  id: string;
  text: string;
  /** Só quando o label não está colado à célula. */
  connector?: Connector;
}

const LABEL_HEIGHT = 18;
const CHAR_WIDTH = 6.5;
const H_PADDING = 24;
export const LABEL_MAX_WIDTH = 150;

/** Distância célula→label sem conector (colado). */
const ADJACENT_GAP = 4;
/** Distâncias com conector discreto, da mais próxima à mais distante. */
const FAR_GAPS = [14, 28, 48];
/** Pequeno deslocamento perpendicular que mantém o label ancorado à célula. */
const SHIFT = 6;

const LABEL_MARGIN = 2;
const CELL_MARGIN = 1;

export const overlaps = (a: Rect, b: Rect, margin = 0) =>
  a.x < b.x + b.w + margin &&
  b.x < a.x + a.w + margin &&
  a.y < b.y + b.h + margin &&
  b.y < a.y + a.h + margin;

export function estimateLabelWidth(text: string): number {
  return Math.min(LABEL_MAX_WIDTH, Math.ceil(text.length * CHAR_WIDTH + H_PADDING));
}

interface Candidate {
  rect: Rect;
  connector?: Connector;
  /** Retângulo fino do conector, para testar colisões. */
  connectorRect?: Rect;
}

/** Candidatos em ordem fixa de preferência: colados primeiro, depois cada vez mais longe. */
function candidatesFor(c: Rect, w: number, h: number): Candidate[] {
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  const out: Candidate[] = [];

  const at = (gap: number, connect: boolean) => {
    const right = (dy: number): Candidate => {
      const rect = { x: c.x + c.w + gap, y: cy - h / 2 + dy, w, h };
      return connect
        ? {
            rect,
            connector: { x1: c.x + c.w, y1: cy, x2: rect.x, y2: cy },
            connectorRect: { x: c.x + c.w, y: cy - 0.5, w: gap, h: 1 },
          }
        : { rect };
    };
    const left = (dy: number): Candidate => {
      const rect = { x: c.x - gap - w, y: cy - h / 2 + dy, w, h };
      return connect
        ? {
            rect,
            connector: { x1: c.x, y1: cy, x2: rect.x + w, y2: cy },
            connectorRect: { x: c.x - gap, y: cy - 0.5, w: gap, h: 1 },
          }
        : { rect };
    };
    const above = (x: number): Candidate => {
      const rect = { x, y: c.y - gap - h, w, h };
      return connect
        ? {
            rect,
            connector: { x1: cx, y1: c.y, x2: cx, y2: rect.y + h },
            connectorRect: { x: cx - 0.5, y: c.y - gap, w: 1, h: gap },
          }
        : { rect };
    };
    const below = (x: number): Candidate => {
      const rect = { x, y: c.y + c.h + gap, w, h };
      return connect
        ? {
            rect,
            connector: { x1: cx, y1: c.y + c.h, x2: cx, y2: rect.y },
            connectorRect: { x: cx - 0.5, y: c.y + c.h, w: 1, h: gap },
          }
        : { rect };
    };
    const centered = cx - w / 2;
    const alignLeft = c.x - 2;
    const alignRight = c.x + c.w + 2 - w;
    out.push(
      right(0), left(0), above(centered), below(centered),
      above(alignLeft), above(alignRight), below(alignLeft), below(alignRight),
      right(-SHIFT), right(SHIFT), left(-SHIFT), left(SHIFT),
    );
  };

  at(ADJACENT_GAP, false);
  for (const gap of FAR_GAPS) at(gap, true);
  return out;
}

/**
 * Posiciona labels por prioridade (primeiro = mais associada). Cada label fica
 * ancorado à própria célula: colado quando possível, senão mais distante com um
 * conector fino, senão omitido. Pode invadir setores vizinhos, mas nunca:
 * sobrepor outro label ou conector, cobrir célula destacada, cobrir `obstacles`
 * (títulos de setor) nem sair de `bounds`. Determinístico.
 */
export function placeLabels(
  items: LabelItem[],
  bounds: { width: number; height: number },
  obstacles: Rect[] = [],
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const connectors: Rect[] = [];
  const cells = items.map((i) => i.cell);

  const inBounds = (r: Rect) =>
    r.x >= 0 && r.y >= 0 && r.x + r.w <= bounds.width && r.y + r.h <= bounds.height;

  for (const item of items) {
    const w = estimateLabelWidth(item.text);
    const others = cells.filter((cell) => cell !== item.cell);

    const spot = candidatesFor(item.cell, w, LABEL_HEIGHT).find(({ rect, connectorRect }) => {
      if (!inBounds(rect)) return false;
      if (placed.some((p) => overlaps(p, rect, LABEL_MARGIN))) return false;
      if (connectors.some((k) => overlaps(k, rect))) return false;
      if (others.some((cell) => overlaps(cell, rect, CELL_MARGIN))) return false;
      if (obstacles.some((o) => overlaps(o, rect, CELL_MARGIN))) return false;
      if (connectorRect) {
        if (placed.some((p) => overlaps(p, connectorRect))) return false;
        if (others.some((cell) => overlaps(cell, connectorRect))) return false;
        if (obstacles.some((o) => overlaps(o, connectorRect))) return false;
        if (connectors.some((k) => overlaps(k, connectorRect))) return false;
      }
      return true;
    });

    if (spot) {
      placed.push({ ...spot.rect, id: item.id, text: item.text, connector: spot.connector });
      if (spot.connectorRect) connectors.push(spot.connectorRect);
    }
  }
  return placed;
}
