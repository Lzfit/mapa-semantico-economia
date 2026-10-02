import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { associationColor } from "@/lib/colors";
import type { Lang } from "@/lib/i18n";
import { OG_IMAGE_SIZE, SITE_COPY } from "@/lib/siteMetadata";

/** Imagem social por idioma (`/og/pt.png`, `/og/en.png`), gerada uma vez no build. */
export const dynamic = "force-static";
export const dynamicParams = false;

const FILES: Record<string, Lang> = { "pt.png": "pt", "en.png": "en" };

export function generateStaticParams() {
  return Object.keys(FILES).map((file) => ({ file }));
}

const BG = "#f7f6f1";
const SURFACE = "#fcfbf8";
const INK = "#202820";
const INK_SOFT = "#6f776f";
const LINE = "#e3e4dd";

/**
 * Mosaico estilizado: painéis setoriais com células de mesmo tamanho; poucos setores acesos.
 * `cols × rows` por painel e `lit` = intensidade base do setor (0 apagado, 1 bem aceso).
 */
const PANELS: { cols: number; rows: number; lit: number }[][] = [
  [
    { cols: 11, rows: 4, lit: 0.15 },
    { cols: 9, rows: 4, lit: 0 },
  ],
  [
    { cols: 6, rows: 4, lit: 0.05 },
    { cols: 7, rows: 4, lit: 0.95 },
    { cols: 6, rows: 4, lit: 0.6 },
  ],
  [
    { cols: 8, rows: 3, lit: 0.1 },
    { cols: 6, rows: 3, lit: 0.35 },
    { cols: 5, rows: 3, lit: 0 },
  ],
  [
    { cols: 7, rows: 2, lit: 0 },
    { cols: 7, rows: 2, lit: 0.75 },
    { cols: 5, rows: 2, lit: 0.05 },
  ],
];

const CELL = 15;
const GAP = 4;

/** Pseudoaleatório determinístico: a imagem é idêntica a cada build. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function cellColor(lit: number, seed: number): string {
  const n = noise(seed);
  if (lit === 0) return associationColor(n * 0.18);
  const score = lit * (0.35 + n * 0.75) + (noise(seed + 0.5) > 0.82 ? 0.25 : 0);
  return associationColor(Math.min(1, score));
}

function Panel({
  cols,
  rows,
  lit,
  seed,
}: {
  cols: number;
  rows: number;
  lit: number;
  seed: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        padding: 14,
        background: SURFACE,
        border: `1px solid ${LINE}`,
        borderRadius: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: GAP,
          width: cols * CELL + (cols - 1) * GAP,
        }}
      >
        {Array.from({ length: cols * rows }, (_, i) => (
          <div
            key={i}
            style={{
              width: CELL,
              height: CELL,
              borderRadius: 3,
              background: cellColor(lit, seed * 1000 + i + 1),
            }}
          />
        ))}
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="42" height="45" viewBox="0 0 28 30">
      <rect x="0" y="16.5" width="6.5" height="13.5" rx="3.25" fill="#6fcb94" />
      <rect
        x="10.75"
        y="8.5"
        width="6.5"
        height="21.5"
        rx="3.25"
        fill="#46b36f"
      />
      <rect x="21.5" y="0" width="6.5" height="30" rx="3.25" fill="#2a9450" />
    </svg>
  );
}

const font = (file: string) =>
  readFile(join(process.cwd(), "assets/fonts", file));

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const lang = FILES[(await params).file];
  if (!lang) return new Response("Not found", { status: 404 });
  const copy = SITE_COPY[lang];
  const [serif, sans] = await Promise.all([
    font("source-serif-4-latin-400-normal.woff"),
    font("inter-latin-400-normal.woff"),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: BG,
        padding: "72px 72px 72px 80px",
        alignItems: "center",
        gap: 56,
        fontFamily: "Inter",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 470 }}>
        <BrandMark />
        <div
          style={{
            marginTop: 36,
            fontFamily: "Source Serif 4",
            fontSize: 60,
            lineHeight: 1.08,
            letterSpacing: -1,
            color: INK,
          }}
        >
          {copy.title}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 25,
            lineHeight: 1.4,
            color: INK_SOFT,
          }}
        >
          {copy.tagline}
        </div>
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}
      >
        {PANELS.map((row, r) => (
          <div key={r} style={{ display: "flex", gap: 10 }}>
            {row.map((p, c) => (
              <Panel key={c} {...p} seed={r * 10 + c + 1} />
            ))}
          </div>
        ))}
      </div>
    </div>,
    {
      ...OG_IMAGE_SIZE,
      fonts: [
        { name: "Source Serif 4", data: serif, weight: 400, style: "normal" },
        { name: "Inter", data: sans, weight: 400, style: "normal" },
      ],
    },
  );
}
