"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { placeLabels } from "@/lib/labelPlacement";
import { cellRect, computeLayout, configForWidth } from "@/lib/sectorLayout";
import type { Rect } from "@/lib/sectorLayout";
import type { Company } from "@/types/company";
import { CompanyTooltip, TOOLTIP_WIDTH } from "./CompanyTooltip";
import { SectorPanel } from "./SectorPanel";

const INITIAL_WIDTH = 1000;

interface Props {
  companies: Company[];
  scores: Record<string, number | null> | null;
  /** Ids das mais associadas, em ordem de prioridade (também recebem label). */
  topIds: string[];
  loading: boolean;
  /** Desktop: células, gaps e paddings reduzidos. */
  compact: boolean;
  /** Desktop com pouca altura: compactação extra. */
  short?: boolean;
}

export function SectorMosaic({ companies, scores, topIds, loading, compact, short = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(INITIAL_WIDTH);
  const [shownId, setShownId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(companies[0].id);

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
    () => computeLayout(companies, configForWidth(width, compact, short)),
    [companies, width, compact, short],
  );
  const { config } = layout;

  const { rects, sequence, colsById } = useMemo(() => {
    const rects = new Map<string, Rect>();
    const colsById = new Map<string, number>();
    const sequence: string[] = [];
    for (const panel of layout.panels) {
      panel.companies.forEach((c, i) => {
        rects.set(c.id, cellRect(panel, i, config));
        colsById.set(c.id, panel.cols);
        sequence.push(c.id);
      });
    }
    return { rects, sequence, colsById };
  }, [layout, config]);

  const byId = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);
  const topSet = useMemo(() => new Set(topIds), [topIds]);

  const labels = useMemo(
    () =>
      placeLabels(
        topIds.map((id) => ({ id, text: byId.get(id)!.name, cell: rects.get(id)! })),
        { width: layout.width, height: layout.height },
      ),
    [topIds, byId, rects, layout.width, layout.height],
  );

  const idFromTarget = (target: EventTarget | null) =>
    (target as HTMLElement | null)?.closest<HTMLElement>("[data-company-id]")?.dataset.companyId ??
    null;

  const focusCell = useCallback((id: string) => {
    setActiveId(id);
    setShownId(id);
    ref.current?.querySelector<HTMLElement>(`[data-company-id="${id}"]`)?.focus();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const id = idFromTarget(e.target);
    if (!id) return;
    if (e.key === "Escape") {
      setShownId(null);
      return;
    }
    const i = sequence.indexOf(id);
    const cols = colsById.get(id) ?? 1;
    const delta: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: cols,
      ArrowUp: -cols,
    };
    let next: number | null = null;
    if (e.key in delta) next = Math.min(sequence.length - 1, Math.max(0, i + delta[e.key]));
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = sequence.length - 1;
    if (next === null) return;
    e.preventDefault();
    focusCell(sequence[next]);
  };

  const shown = shownId ? byId.get(shownId) : null;
  const shownRect = shownId ? rects.get(shownId) : null;
  let tooltipLeft = 0;
  let tooltipTop = 0;
  if (shownRect) {
    const right = shownRect.x + shownRect.w + 8;
    tooltipLeft =
      right + TOOLTIP_WIDTH <= layout.width
        ? right
        : Math.max(0, shownRect.x - 8 - TOOLTIP_WIDTH);
    tooltipTop = Math.max(0, shownRect.y - 6);
  }

  return (
    <div ref={ref} className="w-full">
      <div
        className="relative transition-opacity duration-300 ease-out"
        style={{ height: layout.height, opacity: loading ? 0.55 : 1 }}
        aria-label="Mosaico das 1.000 maiores empresas, agrupadas por setor"
        aria-busy={loading}
        onPointerOver={(e) => setShownId(idFromTarget(e.target))}
        onPointerLeave={() => setShownId(null)}
        onFocus={(e) => {
          const id = idFromTarget(e.target);
          if (id) {
            setActiveId(id);
            setShownId(id);
          }
        }}
        onBlur={() => setShownId(null)}
        onKeyDown={onKeyDown}
      >
        {layout.panels.map((p) => (
          <SectorPanel
            key={p.sector}
            panel={p}
            cell={config.cell}
            gap={config.gap}
            padding={config.panelPadding}
            headerHeight={config.headerHeight}
            titleFont={config.titleFont}
            titleLine={config.titleLine}
            titleTracking={config.titleTracking}
            scores={scores}
            topIds={topSet}
            activeId={activeId}
          />
        ))}
        {labels.map((l) => (
          <span
            key={l.id}
            className="pointer-events-none absolute z-10 flex items-center justify-center truncate rounded-md border border-line bg-surface px-1.5 text-[11px] font-medium leading-none text-ink"
            style={{ left: l.x, top: l.y, width: l.w, height: l.h }}
          >
            <span className="truncate">{l.text}</span>
          </span>
        ))}
        {shown && (
          <CompanyTooltip
            company={shown}
            score={scores?.[shown.id] ?? null}
            left={tooltipLeft}
            top={tooltipTop}
          />
        )}
      </div>
    </div>
  );
}
