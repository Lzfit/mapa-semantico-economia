import { memo } from "react";
import { ASSOCIATION_STOPS, UNSCORED_COLOR } from "@/lib/colors";
import type { Company } from "@/types/company";

interface Props {
  company: Company;
  /** Cor de associação; ausente = tom neutro mínimo. */
  color?: string;
}

export const CompanyCell = memo(function CompanyCell({ company, color }: Props) {
  const unscored = company.undisclosed;
  const label = unscored
    ? `${company.name}, associação não calculada, ${company.sector}`
    : `${company.name}, ${company.sector}`;
  return (
    <div
      role="img"
      aria-label={label}
      data-company-id={company.id}
      className="rounded-[3px] transition-colors duration-[600ms] ease-out"
      style={{
        backgroundColor: unscored ? UNSCORED_COLOR : (color ?? ASSOCIATION_STOPS[0][1]),
        boxShadow: unscored ? "inset 0 0 0 1px #DAD9CF" : undefined,
      }}
    />
  );
});
