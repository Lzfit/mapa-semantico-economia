import { ASSOCIATION_GRADIENT } from "@/lib/colors";

export function ColorLegend() {
  return (
    <div className="max-w-[760px]">
      <div
        className="h-2.5 w-full rounded-full"
        style={{ background: ASSOCIATION_GRADIENT }}
        aria-hidden="true"
      />
      <div className="mt-1.5 flex justify-between text-xs text-ink-soft">
        <span>Menor associação</span>
        <span>Maior associação</span>
      </div>
    </div>
  );
}
