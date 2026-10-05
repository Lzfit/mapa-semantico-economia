"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { searchErrorCategory, trackEvent } from "@/lib/analytics";
import { cleanTheme, isValidTheme } from "@/lib/normalizeTheme";
import { rankingLimit, topAssociated } from "@/lib/ranking";
import { groupBySector } from "@/lib/sectorLayout";
import { activationSectorOrder } from "@/lib/sectorOrder";
import { useIsDesktop, useIsMobile, useIsShortDesktop, useIsTabletShort } from "@/lib/useIsMobile";
import type { Lang } from "@/lib/i18n";
import type { SearchResponse } from "@/types/api";
import type { Company } from "@/types/company";
import { AssociationRanking } from "./AssociationRanking";
import { ColorLegend } from "./ColorLegend";
import { MobileAnswer, MobileMapHeading, MobileRanking, MobileSuggestions } from "./MobileBlocks";
import { Header } from "./Header";
import { useI18n } from "./LanguageProvider";
import { ModelQuestion } from "./ModelQuestion";
import { SearchBar } from "./SearchBar";
import { SectorMosaic } from "./SectorMosaic";

/** Falha de busca; `status` é `null` quando a requisição nem chegou ao servidor. */
class SearchFailedError extends Error {
  constructor(readonly status: number | null) {
    super("search_failed");
  }
}

async function requestSearch(theme: string): Promise<SearchResponse> {
  let res: Response;
  try {
    res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch {
    throw new SearchFailedError(null);
  }
  if (!res.ok) throw new SearchFailedError(res.status);
  return (await res.json()) as SearchResponse;
}

export function MapExperience({ companies }: { companies: Company[] }) {
  const { lang, t } = useI18n();
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
  // `uiLang`: idioma da interface no envio da busca (único dado enviado ao analytics).
  const track = useCallback((seq: number, promise: Promise<SearchResponse>, uiLang: Lang) => {
    promise
      .then((body) => {
        if (seq !== requestSeq.current) return;
        setData(body);
        trackEvent("search_completed", { ui_language: uiLang, success: true });
      })
      .catch((err: unknown) => {
        if (seq !== requestSeq.current) return;
        setFailed(true);
        trackEvent("search_error", {
          ui_language: uiLang,
          success: false,
          // Falha fora do fetch/status (ex.: corpo inválido) conta como erro do servidor.
          error_category:
            err instanceof SearchFailedError ? searchErrorCategory(err.status) : "server_error",
        });
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
      trackEvent("search_submitted", { ui_language: lang });
      track(++requestSeq.current, requestSearch(theme), lang);
    },
    [track, lang],
  );

  const limit = rankingLimit(isMobile, isTabletShort);
  const top = useMemo(() => (data ? topAssociated(data.results, limit) : null), [data, limit]);
  const topIds = useMemo(() => (top ?? []).map((r) => r.id), [top]);
  const scores = useMemo(
    () => (data ? Object.fromEntries(data.results.map((r) => [r.id, r.associationScore])) : null),
    [data],
  );
  const groups = useMemo(() => groupBySector(companies), [companies]);
  // Só no mobile com resultado: os setores mais associados sobem; desktop e tablet mantêm a ordem fixa.
  const sectorOrder = useMemo(
    () => (isMobile && scores ? activationSectorOrder(groups, scores) : null),
    [isMobile, scores, groups],
  );
  const hasResult = data !== null;
  const shownTheme = data?.theme ?? submittedTheme;

  return (
    <div
      className={`flex flex-col gap-7 lg:gap-3.5 short:gap-2.5 tshort:gap-1.5 ${
        hasResult ? "max-md:gap-3 m45:gap-2.5" : "max-md:gap-4"
      }`}
    >
      <Header hasResult={hasResult} />
      <SearchBar
        value={input}
        onChange={setInput}
        onSubmit={() => search(input)}
        loading={loading}
        compact={hasResult}
      />
      {submittedTheme === null && (
        <MobileSuggestions
          onPick={(theme) => {
            setInput(theme);
            search(theme);
          }}
        />
      )}
      <div className={`flex flex-col gap-4 lg:gap-3 short:gap-2 tshort:gap-1 ${hasResult ? "max-md:mt-1 m45:mt-0.5" : "max-md:mt-2.5"}`}>
        <div
          className={`flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:gap-8 tshort:grid tshort:grid-cols-[minmax(0,1fr)_260px] tshort:items-end tshort:gap-6 ${
            shownTheme === null ? "max-md:hidden" : ""
          }`}
        >
          {shownTheme !== null && (
            <>
              <ModelQuestion theme={shownTheme} />
              {isMobile && <MobileAnswer theme={shownTheme} />}
            </>
          )}
          <div className="lg:col-start-2 tshort:col-start-2 max-md:hidden">
            <ColorLegend />
          </div>
        </div>
        {failed && (
          <p role="alert" className="text-sm text-ink-soft">
            {t.error.message}{" "}
            <button
              type="button"
              onClick={() => search(lastTheme.current)}
              className="font-medium text-ink underline underline-offset-2"
            >
              {t.error.retry}
            </button>
          </p>
        )}
        <div className="mt-1 grid grid-cols-1 gap-4 tshort:mt-0 tshort:gap-1 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 max-md:mt-0 max-md:gap-[1.375rem] m45:gap-4">
          <div className="order-2 min-w-0 lg:order-1">
            <MobileMapHeading hasResult={hasResult} />
            {/* Mobile inicial: o mapa esmaece para baixo, sinalizando que continua. */}
            <div
              className={
                hasResult
                  ? ""
                  : "max-md:[mask-image:linear-gradient(to_bottom,#000_0,#000_7.5rem,rgba(0,0,0,0.35)_20rem)]"
              }
            >
            <SectorMosaic
              companies={companies}
              scores={scores}
              topIds={topIds}
              loading={loading}
              compact={isDesktop}
              short={isShort}
              tabletShort={isTabletShort}
              sectorOrder={sectorOrder}
            />
            </div>
          </div>
          <aside className={`order-1 lg:order-2 ${top ? "" : "max-md:hidden"}`}>
            {isMobile ? (
              top && <MobileRanking items={top} loading={loading} />
            ) : (
              <div className="max-md:hidden">
                <AssociationRanking items={top} loading={loading} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
