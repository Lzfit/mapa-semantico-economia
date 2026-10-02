import { ASSOCIATION_GRADIENT } from "@/lib/colors";

export function ColorLegend() {
  return (
    <div className="max-w-[760px] lg:max-w-none">
      <div
        className="h-2.5 w-full rounded-full lg:h-2"
        style={{ background: ASSOCIATION_GRADIENT }}
        aria-hidden="true"
      />
      <div className="mt-1.5 flex justify-between text-xs lg:mt-1 lg:text-[11px] text-ink-soft">
        <span>Menor associação</span>
        <span>Maior associação</span>
      </div>
    </div>
  );
}
