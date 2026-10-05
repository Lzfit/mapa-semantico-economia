/**
 * Ordenação visual dos setores no mobile após uma busca. Só muda a ordem dos painéis:
 * scores, cores, ranking e a ordem das empresas dentro de cada setor não mudam,
 * e o valor calculado aqui nunca é exibido.
 */

/** Quantos setores sobem ao topo; os demais seguem a ordem fixa. */
export const MOBILE_TOP_SECTORS = 5;

/**
 * Sector Activation = 70% da média do quartil superior do setor (mínimo 3 empresas)
 * + 30% da média de todas as empresas do setor. Ignora quem não tem score.
 * Setor sem nenhum score → `null`.
 */
export function sectorActivation(scores: ReadonlyArray<number | null>): number | null {
  const valid = scores.filter((s): s is number => s !== null).sort((a, b) => b - a);
  if (valid.length === 0) return null;
  const k = Math.min(valid.length, Math.max(3, Math.ceil(valid.length * 0.25)));
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  return 0.7 * avg(valid.slice(0, k)) + 0.3 * avg(valid);
}

/**
 * Ordem dos setores: os `top` de maior ativação primeiro (desempate pela ordem fixa),
 * depois os demais na ordem fixa original.
 */
export function activationSectorOrder(
  groups: ReadonlyArray<readonly [string, ReadonlyArray<{ id: string }>]>,
  scores: Record<string, number | null>,
  top = MOBILE_TOP_SECTORS,
): string[] {
  const ranked = groups
    .map(([sector, companies], index) => ({
      sector,
      index,
      activation: sectorActivation(companies.map((c) => scores[c.id] ?? null)),
    }))
    .filter((s) => s.activation !== null)
    .sort((a, b) => b.activation! - a.activation! || a.index - b.index)
    .slice(0, top);
  const lifted = new Set(ranked.map((s) => s.sector));
  return [
    ...ranked.map((s) => s.sector),
    ...groups.map(([sector]) => sector).filter((s) => !lifted.has(s)),
  ];
}
