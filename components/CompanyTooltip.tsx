"use client";

import { formatPercent, formatRevenue } from "@/lib/formatters";
import { sectorName } from "@/lib/i18n";
import type { Company } from "@/types/company";
import { useI18n } from "./LanguageProvider";

export const TOOLTIP_WIDTH = 248;

interface Props {
  company: Company;
  score: number | null;
  left: number;
  top: number;
}

export function CompanyTooltip({ company, score, left, top }: Props) {
  const { lang, t } = useI18n();
  const place = [company.city, company.state].filter(Boolean).join(", ");
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 rounded-lg border border-line bg-surface px-3.5 py-3 text-xs leading-relaxed text-ink-soft shadow-[0_2px_10px_rgba(32,40,32,0.06)]"
      style={{ left, top, width: TOOLTIP_WIDTH }}
    >
      {company.undisclosed ? (
        <>
          <p className="text-sm font-semibold text-ink">{t.undisclosed.tooltipTitle}</p>
          <p className="mt-0.5">{t.undisclosed.notCalculated}</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-ink">{company.name}</p>
          {score !== null && (
            <p className="mt-0.5 font-medium text-ink">{t.tooltip.association(formatPercent(score))}</p>
          )}
          <p className="mt-1.5">{sectorName(company.sector, lang)}</p>
          <p>{t.tooltip.rank(company.rank)}</p>
          {place && <p>{place}</p>}
          {company.revenue2025ThousandsBRL !== null && (
            <p>{t.tooltip.revenue(formatRevenue(company.revenue2025ThousandsBRL, lang))}</p>
          )}
        </>
      )}
    </div>
  );
}
