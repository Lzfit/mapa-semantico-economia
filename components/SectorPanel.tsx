import { memo } from "react";
import type { PanelLayout } from "@/lib/sectorLayout";
import { CompanyCell } from "./CompanyCell";

interface Props {
  panel: PanelLayout;
  cell: number;
  gap: number;
  padding: number;
  headerHeight: number;
}

export const SectorPanel = memo(function SectorPanel({
  panel,
  cell,
  gap,
  padding,
  headerHeight,
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
        className="line-clamp-2 text-[10.5px] font-medium uppercase leading-[14px] tracking-[0.06em] text-ink-soft/80"
        style={{ height: headerHeight }}
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
        {panel.companies.map((c) => (
          <CompanyCell key={c.id} company={c} />
        ))}
      </div>
    </section>
  );
});
