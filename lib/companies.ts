import { readFileSync } from "node:fs";
import path from "node:path";
import type { Company } from "@/types/company";

export const EXPECTED_COMPANY_COUNT = 1000;
export const UNDISCLOSED_NAME = "Empresa não divulgada";

const CSV_PATH = path.join(
  process.cwd(),
  "data",
  "exame_maiores_2026_1000_empresas.csv",
);

const REQUIRED_COLUMNS = [
  "posicao_receita",
  "empresa",
  "setor_primario",
  "receita_2025_mil_reais",
  "receita_2024_mil_reais",
  "lucro_liquido_2025_mil_reais",
  "patrimonio_liquido_2025_mil_reais",
  "ativo_total_2025_mil_reais",
  "cidade_sede",
  "estado",
  "pagina_pdf",
] as const;

/** Parser CSV mínimo (aspas, "" escapado, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const toInt = (v: string): number | null => {
  const t = v.trim();
  return /^-?\d+$/.test(t) ? Number(t) : null;
};

const toText = (v: string): string | null => {
  const t = v.trim();
  return t === "" || t === "-" ? null : t;
};

const UNDISCLOSED_RE = /^\*+\(\d+\)$/;

export function companyId(rank: number): string {
  return `exame2026_${String(rank).padStart(4, "0")}`;
}

/** Converte e valida o CSV da EXAME. Lança erro se a base não for íntegra. */
export function parseCompaniesCsv(text: string): Company[] {
  const [header, ...body] = parseCsv(text);
  if (!header) throw new Error("CSV vazio.");
  const col = new Map(header.map((h, i) => [h.trim(), i]));
  for (const name of REQUIRED_COLUMNS) {
    if (!col.has(name)) throw new Error(`Coluna ausente no CSV: ${name}`);
  }
  const get = (r: string[], name: (typeof REQUIRED_COLUMNS)[number]) =>
    r[col.get(name)!] ?? "";

  if (body.length !== EXPECTED_COMPANY_COUNT) {
    throw new Error(
      `Esperadas ${EXPECTED_COMPANY_COUNT} empresas; o CSV tem ${body.length}.`,
    );
  }

  const companies = body.map((r): Company => {
    const rank = toInt(get(r, "posicao_receita"));
    if (rank === null) {
      throw new Error(`posicao_receita inválida: "${get(r, "posicao_receita")}"`);
    }
    const rawName = get(r, "empresa").trim();
    const sector = get(r, "setor_primario").trim();
    if (!rawName) throw new Error(`Empresa sem nome na posição ${rank}.`);
    if (!sector) throw new Error(`Empresa sem setor na posição ${rank}.`);
    const undisclosed = UNDISCLOSED_RE.test(rawName);
    return {
      id: companyId(rank),
      rank,
      name: undisclosed ? UNDISCLOSED_NAME : rawName,
      undisclosed,
      sector,
      city: toText(get(r, "cidade_sede")),
      state: toText(get(r, "estado")),
      revenue2025ThousandsBRL: toInt(get(r, "receita_2025_mil_reais")),
      revenue2024ThousandsBRL: toInt(get(r, "receita_2024_mil_reais")),
      netProfit2025ThousandsBRL: toInt(get(r, "lucro_liquido_2025_mil_reais")),
      equity2025ThousandsBRL: toInt(get(r, "patrimonio_liquido_2025_mil_reais")),
      totalAssets2025ThousandsBRL: toInt(get(r, "ativo_total_2025_mil_reais")),
      pdfPage: toInt(get(r, "pagina_pdf")),
    };
  });

  companies.sort((a, b) => a.rank - b.rank);
  companies.forEach((c, i) => {
    if (c.rank !== i + 1) {
      throw new Error(
        `posicao_receita deve ser 1…${EXPECTED_COMPANY_COUNT} sem repetição (problema perto de ${c.rank}).`,
      );
    }
  });
  return companies;
}

let cached: Company[] | null = null;

/** Carrega a base no servidor (uma vez por processo). */
export function loadCompanies(): Company[] {
  cached ??= parseCompaniesCsv(readFileSync(CSV_PATH, "utf-8"));
  return cached;
}
