"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { computeLayout, configForWidth } from "@/lib/sectorLayout";
import type { Company } from "@/types/company";
import { SectorPanel } from "./SectorPanel";

const INITIAL_WIDTH = 1000;

export function SectorMosaic({ companies }: { companies: Company[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(INITIAL_WIDTH);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.floor(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Geometria depende só da largura do container, nunca do tema pesquisado.
  const layout = useMemo(
    () => computeLayout(companies, configForWidth(width)),
    [companies, width],
  );
  const { config } = layout;

  return (
    <div ref={ref} className="w-full">
      <div
        className="relative"
        style={{ height: layout.height }}
        aria-label="Mosaico das 1.000 maiores empresas, agrupadas por setor"
      >
        {layout.panels.map((p) => (
          <SectorPanel
            key={p.sector}
            panel={p}
            cell={config.cell}
            gap={config.gap}
            padding={config.panelPadding}
            headerHeight={config.headerHeight}
          />
        ))}
      </div>
    </div>
  );
}
