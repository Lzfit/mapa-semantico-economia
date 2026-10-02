/** Escala contínua de associação (SPEC §3). */
export const ASSOCIATION_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, "#E9EBE6"],
  [0.25, "#D8E5D9"],
  [0.5, "#B7D7BD"],
  [0.75, "#78BC88"],
  [1, "#2F9D55"],
];

/** Cor neutra própria da célula sem score (entidade não divulgada). */
export const UNSCORED_COLOR = "#F1F0EA";

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

export function associationColor(score: number): string {
  const s = Math.min(1, Math.max(0, score));
  for (let i = 1; i < ASSOCIATION_STOPS.length; i++) {
    const [t1, c1] = ASSOCIATION_STOPS[i];
    if (s <= t1) {
      const [t0, c0] = ASSOCIATION_STOPS[i - 1];
      const k = (s - t0) / (t1 - t0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      const [r, g, bl] = a.map((v, j) => Math.round(v + (b[j] - v) * k));
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  return ASSOCIATION_STOPS[ASSOCIATION_STOPS.length - 1][1];
}

export const ASSOCIATION_GRADIENT = `linear-gradient(to right, ${ASSOCIATION_STOPS.map(
  ([t, c]) => `${c} ${t * 100}%`,
).join(", ")})`;
