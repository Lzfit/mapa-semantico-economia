"use client";

import { ASSOCIATION_GRADIENT } from "@/lib/colors";
import { useI18n } from "./LanguageProvider";

export function ColorLegend() {
  const { t } = useI18n();
  return (
    <div className="max-w-[760px] lg:max-w-none tshort:max-w-none">
      <div
        className="h-2.5 w-full rounded-full lg:h-2 tshort:h-2"
        style={{ background: ASSOCIATION_GRADIENT }}
        aria-hidden="true"
      />
      <div className="mt-1.5 flex justify-between text-xs lg:mt-1 lg:text-[11px] tshort:mt-1 tshort:text-[11px] text-ink-soft">
        <span>{t.legend.lower}</span>
        <span>{t.legend.higher}</span>
      </div>
    </div>
  );
}
