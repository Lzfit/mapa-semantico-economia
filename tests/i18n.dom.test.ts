// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { loadCompanies } from "@/lib/companies";
import type { SearchResponse } from "@/types/api";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const companies = loadCompanies();
const mockResponse = (theme: string): SearchResponse => ({
  theme,
  question: "",
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
  fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const { theme } = JSON.parse(init.body as string) as { theme: string };
    return new Response(JSON.stringify(mockResponse(theme)), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
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

/** Simula um carregamento da página com a URL dada (como um reload). */
async function load(url: string) {
  act(() => root?.unmount());
  window.history.replaceState(null, "", url);
  const lang = new URL(window.location.href).searchParams.get("lang") ?? undefined;
  const page = await Home({ searchParams: Promise.resolve({ lang }) });
  root = createRoot(container);
  await act(async () => root!.render(page));
}

const h1 = () => container.querySelector("h1")!.textContent;
const input = () => container.querySelector("input")!;
const langButton = (l: string) => container.querySelector<HTMLButtonElement>(`button[lang="${l}"]`)!;
const text = () => container.textContent ?? "";

async function search(theme: string) {
  const el = input();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(el, theme);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => {
    container.querySelector("form")!.requestSubmit();
  });
}

describe("idioma na página", () => {
  it("sem parâmetro abre em PT; ?lang=en abre em EN", async () => {
    await load("/");
    expect(h1()).toBe("Mapa Semântico da Economia Brasileira");
    expect(input().placeholder).toBe("Digite um tema");
    expect(langButton("pt").getAttribute("aria-pressed")).toBe("true");

    await load("/?lang=en");
    expect(h1()).toBe("Semantic Map of the Brazilian Economy");
    expect(input().placeholder).toBe("Enter a topic");
    expect(text()).toContain("Source: EXAME Melhores e Maiores 2026 • Semantic association: Jev / TypeSafe");
    expect(document.documentElement.lang).toBe("en");
  });

  it("toggle PT → EN → PT atualiza texto e URL sem recarregar nem chamar o Jev", async () => {
    await load("/");
    await act(async () => langButton("en").click());
    expect(h1()).toBe("Semantic Map of the Brazilian Economy");
    expect(window.location.search).toBe("?lang=en");
    expect(langButton("en").getAttribute("aria-pressed")).toBe("true");

    await act(async () => langButton("pt").click());
    expect(h1()).toBe("Mapa Semântico da Economia Brasileira");
    expect(window.location.search).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("não usa armazenamento local", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem");
    await load("/");
    await act(async () => langButton("en").click());
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("query do usuário", () => {
  it("UI em EN envia “café” como digitado; UI em PT envia “data centers”", async () => {
    await load("/?lang=en");
    await search("café");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ theme: "café" });

    await load("/");
    await search("data centers");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ theme: "data centers" });
  });

  it("trocar o idioma com resultado na tela não dispara nova busca e mantém o resultado", async () => {
    await load("/");
    await search("café");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(text()).toContain("PERGUNTA AO MODELO");

    await act(async () => langButton("en").click());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(text()).toContain("QUESTION FOR THE MODEL");
    expect(text()).toContain("related to “café”?");
    expect(text()).toContain("MOST ASSOCIATED");
    expect(container.querySelectorAll("ol li")).toHaveLength(8);
    expect(input().value).toBe("café");
  });

  it("tooltip acompanha o idioma", async () => {
    await load("/?lang=en");
    await search("café");
    const cell = container.querySelector<HTMLElement>('[data-company-id="exame2026_0065"]')!;
    await act(async () => cell.focus());
    const tip = () => container.querySelector('[role="tooltip"]')!.textContent;
    expect(tip()).toContain("99% association");
    expect(tip()).toContain("#65 in the EXAME ranking");
    await act(async () => langButton("pt").click());
    await act(async () => cell.focus());
    expect(tip()).toContain("99% de associação");
    expect(tip()).toContain("#65 no ranking EXAME");
  });
});

describe("reload", () => {
  it("com ?lang=en continua em EN e com a busca vazia", async () => {
    await load("/");
    await act(async () => langButton("en").click());
    await search("café");
    await load(window.location.pathname + window.location.search);
    expect(h1()).toBe("Semantic Map of the Brazilian Economy");
    expect(input().value).toBe("");
    expect(text()).not.toContain("QUESTION FOR THE MODEL");
    expect(text()).toContain("The companies most associated with the topic will appear here.");
  });
});
