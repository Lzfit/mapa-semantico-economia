import { memo } from "react";
import { ASSOCIATION_STOPS, UNSCORED_COLOR } from "@/lib/colors";
import type { Company } from "@/types/company";

interface Props {
  company: Company;
  /** Cor de associação; ausente = tom neutro mínimo. */
  color?: string;
  /** Texto de acessibilidade com o percentual, quando houver score. */
  scoreLabel?: string;
  /** Top N do tema atual: destaque por anel, sem mudar o tamanho. */
  highlighted?: boolean;
  tabIndex: 0 | -1;
}

export const CompanyCell = memo(function CompanyCell({
  company,
  color,
  scoreLabel,
  highlighted,
  tabIndex,
}: Props) {
  const unscored = company.undisclosed;
  const label = unscored
    ? `${company.name}, associação não calculada, ${company.sector}`
    : `${company.name}${scoreLabel ? `, ${scoreLabel}` : ""}, ${company.sector}`;
  const shadows: string[] = [];
  if (unscored) shadows.push("inset 0 0 0 1px #DAD9CF");
  if (highlighted) shadows.push("0 0 0 1.5px rgba(32, 40, 32, 0.75)");
  return (
    <div
      role="img"
      aria-label={label}
      data-company-id={company.id}
      tabIndex={tabIndex}
      className="rounded-[3px] outline-none transition-colors duration-[600ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
      style={{
        backgroundColor: unscored ? UNSCORED_COLOR : (color ?? ASSOCIATION_STOPS[0][1]),
        boxShadow: shadows.length ? shadows.join(", ") : undefined,
        position: highlighted ? "relative" : undefined,
        zIndex: highlighted ? 1 : undefined,
      }}
    />
  );
});
