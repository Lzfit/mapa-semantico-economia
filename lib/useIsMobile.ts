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

/** Tablet largo (768–1023px) com pouca altura (ex.: 789×718): mesma compactação do desktop baixo. */
export function useIsTabletShort(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px) and (max-height: 760px)");
}

/** Desktop com pouca altura (ex.: 1280×720): compactação extra. */
export function useIsShortDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px) and (max-height: 760px)");
}
