"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { cleanTheme, isValidTheme } from "@/lib/normalizeTheme";
import { rankingLimit, topAssociated } from "@/lib/ranking";
import { useIsDesktop, useIsMobile, useIsShortDesktop, useIsTabletShort } from "@/lib/useIsMobile";
import type { SearchResponse } from "@/types/api";
import type { Company } from "@/types/company";
import { AssociationRanking } from "./AssociationRanking";
import { ColorLegend } from "./ColorLegend";
import { Header } from "./Header";
import { ModelQuestion } from "./ModelQuestion";
import { SearchBar } from "./SearchBar";
import { SectorMosaic } from "./SectorMosaic";

const ERROR_MESSAGE = "Não foi possível concluir esta análise. Tente novamente.";

async function requestSearch(theme: string): Promise<SearchResponse> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ theme }),
  });
  if (!res.ok) throw new Error("search_failed");
  return (await res.json()) as SearchResponse;
}

export function MapExperience({ companies }: { companies: Company[] }) {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const isShort = useIsShortDesktop();
  const isTabletShort = useIsTabletShort();
  const [input, setInput] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  // Tema da primeira busca executada; `null` enquanto nenhuma busca foi feita.
  const [submittedTheme, setSubmittedTheme] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastTheme = useRef("");
  const requestSeq = useRef(0);

  // Atualiza o mapa só quando os scores completos chegam; respostas antigas são descartadas.
  const track = useCallback((seq: number, promise: Promise<SearchResponse>) => {
    promise
      .then((body) => {
        if (seq === requestSeq.current) setData(body);
      })
      .catch(() => {
        if (seq === requestSeq.current) setFailed(true);
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, []);

  const search = useCallback(
    (rawTheme: string) => {
      const theme = cleanTheme(rawTheme);
      if (!isValidTheme(theme)) return;
      lastTheme.current = theme;
      setSubmittedTheme((prev) => prev ?? theme);
      setLoading(true);
      setFailed(false);
      track(++requestSeq.current, requestSearch(theme));
    },
    [track],
  );

  const limit = rankingLimit(isMobile, isTabletShort);
  const top = useMemo(() => (data ? topAssociated(data.results, limit) : null), [data, limit]);
  const topIds = useMemo(() => (top ?? []).map((r) => r.id), [top]);
  const scores = useMemo(
    () => (data ? Object.fromEntries(data.results.map((r) => [r.id, r.associationScore])) : null),
    [data],
  );

  return (
    <div className="flex flex-col gap-7 lg:gap-3.5 short:gap-2.5 tshort:gap-1.5">
      <Header hasResult={data !== null} />
      <SearchBar
        value={input}
        onChange={setInput}
        onSubmit={() => search(input)}
        loading={loading}
      />
      <div className="flex flex-col gap-4 lg:gap-3 short:gap-2 tshort:gap-1">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:gap-8 tshort:grid tshort:grid-cols-[minmax(0,1fr)_260px] tshort:items-end tshort:gap-6">
          {submittedTheme !== null && <ModelQuestion theme={data?.theme ?? submittedTheme} />}
          <div className="lg:col-start-2 tshort:col-start-2">
            <ColorLegend />
          </div>
        </div>
        {failed && (
          <p role="alert" className="text-sm text-ink-soft">
            {ERROR_MESSAGE}{" "}
            <button
              type="button"
              onClick={() => search(lastTheme.current)}
              className="font-medium text-ink underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </p>
        )}
        <div className="mt-1 grid grid-cols-1 gap-4 tshort:mt-0 tshort:gap-1 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="order-2 min-w-0 lg:order-1">
            <SectorMosaic
              companies={companies}
              scores={scores}
              topIds={topIds}
              loading={loading}
              compact={isDesktop}
              short={isShort}
              tabletShort={isTabletShort}
            />
          </div>
          <aside className="order-1 lg:order-2">
            <AssociationRanking items={top} loading={loading} />
          </aside>
        </div>
      </div>
    </div>
  );
}
