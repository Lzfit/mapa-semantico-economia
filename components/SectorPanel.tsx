import { memo } from "react";
import { associationColor } from "@/lib/colors";
import type { PanelLayout } from "@/lib/sectorLayout";
import { CompanyCell } from "./CompanyCell";

interface Props {
  panel: PanelLayout;
  cell: number;
  gap: number;
  padding: number;
  headerHeight: number;
  titleFont: number;
  titleLine: number;
  titleTracking: number;
  /** `null` antes da primeira análise. */
  scores: Record<string, number | null> | null;
  topIds: ReadonlySet<string>;
  activeId: string;
}

export const SectorPanel = memo(function SectorPanel({
  panel,
  cell,
  gap,
  padding,
  headerHeight,
  titleFont,
  titleLine,
  titleTracking,
  scores,
  topIds,
  activeId,
}: Props) {
  return (
    <section
      aria-label={panel.sector}
      className="absolute rounded-lg border border-line/50 bg-surface/50"
      style={{
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.height,
        padding,
      }}
    >
      <h3
        className="line-clamp-2 font-medium uppercase text-ink-soft/80"
        style={{ height: headerHeight, fontSize: titleFont, lineHeight: `${titleLine}px`, letterSpacing: `${titleTracking}em` }}
      >
        {panel.sector}
      </h3>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${panel.cols}, ${cell}px)`,
          gridAutoRows: `${cell}px`,
          gap,
        }}
      >
        {panel.companies.map((c) => {
          const score = scores?.[c.id] ?? null;
          return (
            <CompanyCell
              key={c.id}
              company={c}
              color={score === null ? undefined : associationColor(score)}
              scoreLabel={score === null ? undefined : `${Math.round(score * 100)} por cento de associação`}
              highlighted={topIds.has(c.id)}
              tabIndex={c.id === activeId ? 0 : -1}
            />
          );
        })}
      </div>
    </section>
  );
});

