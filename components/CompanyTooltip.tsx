import { formatPercent, formatRevenueBi } from "@/lib/formatters";
import type { Company } from "@/types/company";

export const TOOLTIP_WIDTH = 248;

interface Props {
  company: Company;
  score: number | null;
  left: number;
  top: number;
}

export function CompanyTooltip({ company, score, left, top }: Props) {
  const place = [company.city, company.state].filter(Boolean).join(", ");
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-lg border border-line bg-surface px-3.5 py-3 text-xs leading-relaxed text-ink-soft shadow-[0_2px_10px_rgba(32,40,32,0.06)]"
      style={{ left, top, width: TOOLTIP_WIDTH }}
    >
      {company.undisclosed ? (
        <>
          <p className="text-sm font-semibold text-ink">Empresa não divulgada pela fonte</p>
          <p className="mt-0.5">Associação não calculada</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink">{company.name}</p>
          {score !== null && (
            <p className="mt-0.5 font-medium text-ink">{formatPercent(score)} de associação</p>
          )}
          <p className="mt-1.5">{company.sector}</p>
          <p>#{company.rank} no ranking EXAME</p>
          {place && <p>{place}</p>}
          {company.revenue2025ThousandsBRL !== null && (
            <p>Receita 2025: {formatRevenueBi(company.revenue2025ThousandsBRL)}</p>
          )}
        </>
      )}
    </div>
  );
}
