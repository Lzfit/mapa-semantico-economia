// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import {
  GA_MEASUREMENT_ID,
  searchErrorCategory,
  trackEvent,
} from "@/lib/analytics";
import { loadCompanies } from "@/lib/companies";
import type { SearchResponse } from "@/types/api";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const THEME = "café especial";
const companies = loadCompanies();
const mockResponse = (theme: string): SearchResponse => ({
  theme,
  question: `pergunta sobre ${theme}`,
  cached: false,
  model: "mock",
  elapsedMs: 1,
  results: companies.map((c) => ({
    id: c.id,
    rank: c.rank,
    company: c.name,
    sector: c.sector,
    city: c.city,
    state: c.state,
    revenue2025ThousandsBRL: c.revenue2025ThousandsBRL,
    associationScore: c.undisclosed ? null : c.rank === 65 ? 0.99 : 0.1,
  })),
});

let root: Root | null = null;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
let gtag: ReturnType<typeof vi.fn>;

const okFetch = async (_url: string, init: RequestInit) => {
  const { theme } = JSON.parse(init.body as string) as { theme: string };
  return new Response(JSON.stringify(mockResponse(theme)), { status: 200 });
};

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  fetchMock = vi.fn(okFetch);
  vi.stubGlobal("fetch", fetchMock);
  gtag = vi.fn();
  vi.stubGlobal("gtag", gtag);
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  container.remove();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

async function load(url: string) {
  act(() => root?.unmount());
  window.history.replaceState(null, "", url);
  const lang =
    new URL(window.location.href).searchParams.get("lang") ?? undefined;
  const page = await Home({ searchParams: Promise.resolve({ lang }) });
  root = createRoot(container);
  await act(async () => root!.render(page));
}

const input = () => container.querySelector("input")!;
const langButton = (l: string) =>
  container.querySelector<HTMLButtonElement>(`button[lang="${l}"]`)!;

async function search(theme: string) {
  const el = input();
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  await act(async () => {
    setter.call(el, theme);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    container.querySelector("form")!.requestSubmit();
  });
}

const events = () =>
  gtag.mock.calls.map(([cmd, name, params]) => {
    expect(cmd).toBe("event");
    return { name: name as string, params: params as Record<string, unknown> };
  });

/** Nenhum parâmetro enviado ao GA4 contém o tema, nomes de empresas ou dados da resposta. */
function expectNoSearchContent() {
  const sent = JSON.stringify(gtag.mock.calls);
  expect(sent).not.toMatch(/caf[eé]/i);
  for (const name of ["McDonald", "Petrobras", "Timbro", "MBRF"])
    expect(sent).not.toContain(name);
  for (const key of [
    "theme",
    "query",
    "search_term",
    "company",
    "score",
    "rank",
    "results",
  ]) {
    expect(sent).not.toContain(`"${key}"`);
  }
}

describe("GA4: inicialização", () => {
  it("usa o Measurement ID fixo G-L7DMY152CK e envia só o idioma no page_view", async () => {
    expect(GA_MEASUREMENT_ID).toBe("G-L7DMY152CK");
    await load(
      "/?lang=en&utm_source=linkedin&utm_medium=social&utm_campaign=lancamento",
    );
    const scripts = [...document.querySelectorAll("script")];
    expect(
      scripts.some((s) => s.src.endsWith(`/gtag/js?id=${GA_MEASUREMENT_ID}`)),
    ).toBe(true);
    const init = scripts.find((s) => s.id === "ga4-init")!.textContent ?? "";
    expect(init).toContain(
      `gtag('config', '${GA_MEASUREMENT_ID}', { ui_language: 'en' })`,
    );
    expect(init).not.toMatch(/googletagmanager\.com\/gtm|GTM-/);
    // Parâmetros UTM continuam na URL para o GA4 atribuir a sessão.
    expect(window.location.search).toContain("utm_source=linkedin");
  });
});

describe("GA4: eventos de busca", () => {
  it("search_submitted e search_completed levam só idioma e sucesso", async () => {
    await load("/");
    await search(THEME);
    expect(events()).toEqual([
      { name: "search_submitted", params: { ui_language: "pt" } },
      {
        name: "search_completed",
        params: { ui_language: "pt", success: true },
      },
    ]);
    expectNoSearchContent();
  });

  it("em EN o idioma enviado é en", async () => {
    await load("/?lang=en");
    await search(THEME);
    expect(events().map((e) => e.params.ui_language)).toEqual(["en", "en"]);
  });

  it("search_error leva só idioma, success=false e categoria genérica", async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({ error: `falhou para ${THEME}` }, { status: 429 }),
    );
    await load("/");
    await search(THEME);
    expect(events()).toEqual([
      { name: "search_submitted", params: { ui_language: "pt" } },
      {
        name: "search_error",
        params: {
          ui_language: "pt",
          success: false,
          error_category: "rate_limited",
        },
      },
    ]);
    expectNoSearchContent();
  });

  it("falha de rede vira categoria network", async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError(`Failed to fetch ${THEME}`);
    });
    await load("/");
    await search(THEME);
    expect(events()[1]).toEqual({
      name: "search_error",
      params: { ui_language: "pt", success: false, error_category: "network" },
    });
    expectNoSearchContent();
  });

  it("a busca continua funcionando sem gtag (analytics bloqueado)", async () => {
    vi.stubGlobal("gtag", undefined);
    await load("/");
    await search(THEME);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      theme: THEME,
    });
    expect(container.querySelectorAll("ol li")).toHaveLength(8);
  });
});

describe("GA4: troca de idioma", () => {
  it("language_changed leva só from/to e não chama /api/search", async () => {
    await load("/");
    await act(async () => langButton("en").click());
    await act(async () => langButton("en").click()); // já em EN: sem evento
    await act(async () => langButton("pt").click());
    expect(events()).toEqual([
      {
        name: "language_changed",
        params: { from_language: "pt", to_language: "en" },
      },
      {
        name: "language_changed",
        params: { from_language: "en", to_language: "pt" },
      },
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("com resultado na tela, trocar idioma não refaz a busca e eventos seguintes usam o novo idioma", async () => {
    await load("/");
    await search(THEME);
    await act(async () => langButton("en").click());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await search(THEME);
    expect(events().map((e) => e.name)).toEqual([
      "search_submitted",
      "search_completed",
      "language_changed",
      "search_submitted",
      "search_completed",
    ]);
    expect(events()[3].params).toEqual({ ui_language: "en" });
    expectNoSearchContent();
  });
});

describe("trackEvent", () => {
  it("descarta qualquer parâmetro fora da lista permitida", () => {
    trackEvent("search_submitted", {
      ui_language: "pt",
      theme: THEME,
      search_term: THEME,
    } as unknown as { ui_language: "pt" });
    expect(gtag).toHaveBeenCalledWith("event", "search_submitted", {
      ui_language: "pt",
    });
  });

  it("erro do gtag não propaga", () => {
    gtag.mockImplementation(() => {
      throw new Error("bloqueado");
    });
    expect(() =>
      trackEvent("search_submitted", { ui_language: "pt" }),
    ).not.toThrow();
  });

  it("categorias de erro derivadas só do status", () => {
    expect([400, 429, 503, 502, 500, null].map(searchErrorCategory)).toEqual([
      "invalid_input",
      "rate_limited",
      "unavailable",
      "server_error",
      "server_error",
      "network",
    ]);
  });
});
