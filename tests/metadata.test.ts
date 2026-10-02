import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateMetadata } from "@/app/page";
import { generateStaticParams } from "@/app/og/[file]/route";

const meta = (lang?: string) => generateMetadata({ searchParams: Promise.resolve({ lang }) });

const PT_TITLE = "Mapa Semântico da Economia Brasileira";
const PT_DESC =
  "Explore como temas, mercados e tendências se conectam às 1.000 maiores empresas do Brasil.";
const EN_TITLE = "Semantic Map of the Brazilian Economy";
const EN_DESC = "Explore how topics, markets and trends connect to Brazil’s 1,000 largest companies.";
const BASE = "https://mapa-semantico-economia.vercel.app";

describe("metadata por idioma", () => {
  it("sem parâmetro (padrão) → português", async () => {
    const m = await meta();
    expect(m.title).toBe(PT_TITLE);
    expect(m.description).toBe(PT_DESC);
    expect(String(m.metadataBase)).toBe(`${BASE}/`);
    expect(m.alternates?.canonical).toBe(`${BASE}/`);
  });

  it("?lang=en → inglês; outros valores → português", async () => {
    const en = await meta("en");
    expect(en.title).toBe(EN_TITLE);
    expect(en.description).toBe(EN_DESC);
    expect(en.alternates?.canonical).toBe(`${BASE}/?lang=en`);
    expect((await meta("xx")).title).toBe(PT_TITLE);
  });

  it("Open Graph com título, descrição, URL, nome do produto e imagem 1200×630 do idioma", async () => {
    for (const [lang, title, desc, url, img] of [
      [undefined, PT_TITLE, PT_DESC, `${BASE}/`, "/og/pt.png"],
      ["en", EN_TITLE, EN_DESC, `${BASE}/?lang=en`, "/og/en.png"],
    ] as const) {
      const og = (await meta(lang)).openGraph as Record<string, unknown>;
      expect(og).toMatchObject({ type: "website", title, description: desc, url, siteName: title });
      expect(og.images).toEqual([
        expect.objectContaining({ url: img, width: 1200, height: 630, alt: title }),
      ]);
    }
  });

  it("Twitter/X summary_large_image no idioma", async () => {
    const tw = (await meta("en")).twitter as Record<string, unknown>;
    expect(tw).toMatchObject({ card: "summary_large_image", title: EN_TITLE, description: EN_DESC });
    expect(tw.images).toEqual([expect.objectContaining({ url: "/og/en.png" })]);
    expect(((await meta()).twitter as Record<string, unknown>).title).toBe(PT_TITLE);
  });

  it("imagens sociais PT e EN são geradas no build, sem serviço externo", () => {
    expect(generateStaticParams()).toEqual([{ file: "pt.png" }, { file: "en.png" }]);
    const src = readFileSync("app/og/[file]/route.tsx", "utf8");
    expect(src).not.toMatch(/https?:\/\//);
  });
});

describe("favicon", () => {
  it("ícone SVG das três barras e favicon.ico existem no app", () => {
    const svg = readFileSync("app/icon.svg", "utf8");
    expect(svg.match(/<rect /g)).toHaveLength(3);
    expect(svg).not.toMatch(/<text|<image|href=/);
    for (const color of ["#6fcb94", "#46b36f", "#2a9450"]) expect(svg).toContain(color);
    // Cabeçalho ICO: reservado 0, tipo 1 (ícone), 3 imagens (16, 32, 48).
    expect(existsSync("app/favicon.ico")).toBe(true);
    const ico = readFileSync("app/favicon.ico");
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([0, 1, 3]);
  });
});
