import { useSyncExternalStore } from "react";

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Viewport < 768px (SPEC §18). No servidor assume desktop. */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** Viewport ≥ 1024px: layout desktop (mosaico + ranking lado a lado), compacto. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
