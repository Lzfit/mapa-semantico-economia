/**
 * Fonte única dos textos da interface (PT/EN). Só apresentação: a query do usuário,
 * o contexto enviado ao Jev, o cache e os valores da base EXAME não dependem do idioma.
 */

export type Lang = "pt" | "en";

export const LANGS: readonly Lang[] = ["pt", "en"];
export const DEFAULT_LANG: Lang = "pt";

/** Nome de cada idioma nele mesmo (rótulo acessível do seletor). */
export const LANG_NAMES: Record<Lang, string> = { pt: "Português", en: "English" };

/** `?lang=en` → inglês; ausente, `pt` ou qualquer outro valor → português. */
export function parseLang(value: string | string[] | null | undefined): Lang {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "en" ? "en" : DEFAULT_LANG;
}

/** URL (path + query + hash) com o idioma: `lang=en` explícito; português remove o parâmetro. */
export function urlForLang(href: string, lang: Lang): string {
  const url = new URL(href);
  if (lang === DEFAULT_LANG) url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  return `${url.pathname}${url.search}${url.hash}`;
}

export interface Messages {
  /** Valor de `<html lang>`. */
  htmlLang: string;
  title: string;
  subtitle: string;
  languageToggle: { group: string };
  search: { placeholder: string; inputLabel: string; submitLabel: string };
  question: {
    heading: string;
    /** Texto antes e depois de “{tema}”; o tema entra entre aspas, sem tradução. */
    before: string;
    after: string;
  };
  legend: { lower: string; higher: string };
  ranking: { heading: string; empty: string };
  error: { message: string; retry: string };
  mosaic: { label: string };
  cell: { percentLabel: (pct: number) => string; notCalculated: string };
  tooltip: {
    association: (percent: string) => string;
    rank: (rank: number) => string;
    revenue: (value: string) => string;
  };
  undisclosed: { name: string; tooltipTitle: string; notCalculated: string };
  footer: { source: string; association: string };
}

const pt: Messages = {
  htmlLang: "pt-BR",
  title: "Mapa Semântico da Economia Brasileira",
  subtitle: "Digite um tema e veja que partes da economia brasileira se acendem.",
  languageToggle: { group: "Idioma" },
  search: { placeholder: "Digite um tema", inputLabel: "Tema", submitLabel: "Buscar" },
  question: {
    heading: "PERGUNTA AO MODELO",
    before:
      "Quais das 1.000 maiores empresas do Brasil participam de forma economicamente relevante do mercado, da cadeia de valor ou do ecossistema relacionado a ",
    after: "?",
  },
  legend: { lower: "Menor associação", higher: "Maior associação" },
  ranking: {
    heading: "MAIS ASSOCIADAS",
    empty: "As empresas mais associadas ao tema aparecerão aqui.",
  },
  error: {
    message: "Não foi possível concluir esta análise. Tente novamente.",
    retry: "Tentar novamente",
  },
  mosaic: { label: "Mosaico das 1.000 maiores empresas, agrupadas por setor" },
  cell: {
    percentLabel: (pct) => `${pct} por cento de associação`,
    notCalculated: "associação não calculada",
  },
  tooltip: {
    association: (percent) => `${percent} de associação`,
    rank: (rank) => `#${rank} no ranking EXAME`,
    revenue: (value) => `Receita 2025: ${value}`,
  },
  undisclosed: {
    name: "Empresa não divulgada",
    tooltipTitle: "Empresa não divulgada pela fonte",
    notCalculated: "Associação não calculada",
  },
  footer: { source: "Base", association: "Associação semântica" },
};

const en: Messages = {
  htmlLang: "en",
  title: "Semantic Map of the Brazilian Economy",
  subtitle: "Enter a topic and see which parts of Brazil’s economy light up.",
  languageToggle: { group: "Language" },
  search: { placeholder: "Enter a topic", inputLabel: "Topic", submitLabel: "Search" },
  question: {
    heading: "QUESTION TO THE MODEL",
    before:
      "Which of Brazil’s 1,000 largest companies participate in an economically relevant way in the market, value chain or ecosystem related to ",
    after: "?",
  },
  legend: { lower: "Lower association", higher: "Higher association" },
  ranking: {
    heading: "MOST ASSOCIATED",
    empty: "The companies most associated with the topic will appear here.",
  },
  error: {
    message: "This analysis could not be completed. Please try again.",
    retry: "Try again",
  },
  mosaic: { label: "Mosaic of the 1,000 largest companies, grouped by sector" },
  cell: {
    percentLabel: (pct) => `${pct} percent association`,
    notCalculated: "association not calculated",
  },
  tooltip: {
    association: (percent) => `${percent} association`,
    rank: (rank) => `#${rank} in the EXAME ranking`,
    revenue: (value) => `2025 revenue: ${value}`,
  },
  undisclosed: {
    name: "Undisclosed company",
    tooltipTitle: "Company not disclosed by the source",
    notCalculated: "Association not calculated",
  },
  footer: { source: "Source", association: "Semantic association" },
};

export const MESSAGES: Record<Lang, Messages> = { pt, en };

/** Pergunta ao modelo, como texto corrido. */
export function modelQuestion(theme: string, lang: Lang): string {
  const q = MESSAGES[lang].question;
  return `${q.before}“${theme}”${q.after}`;
}

/**
 * Setores da base EXAME 2026 (`setor_primario`) → inglês. Mapeamento explícito; o valor
 * original continua sendo a chave de agrupamento e de layout.
 */
export const SECTOR_EN: Readonly<Record<string, string>> = {
  "Transporte, Logística e Serviços Logísticos": "Transportation and Logistics",
  "Energia Elétrica": "Electric Power",
  Bancos: "Banking",
  "Combustíveis, Petróleo e Químico": "Fuels, Oil and Chemicals",
  Seguradoras: "Insurance",
  Agronegócio: "Agribusiness",
  "Imobiliário e Construção Civil": "Real Estate and Construction",
  "Alimentos e Bebidas": "Food and Beverages",
  "Siderurgia, Mineração e Metalurgia": "Steel, Mining and Metallurgy",
  "Atacado e Varejo": "Wholesale and Retail",
  "Bens de Capital e Eletroeletrônicos": "Capital Goods and Electronics",
  "Tecnologia e Telecomunicações": "Technology and Telecommunications",
  "Serviços Financeiros": "Financial Services",
  "Saúde e Serviços de Saúde": "Healthcare and Health Services",
  "Saneamento e Meio Ambiente": "Sanitation and Environmental Services",
  "Farmacêutico e Beleza": "Pharmaceuticals and Beauty",
  "Participações e Mídia": "Holdings and Media",
  Cooperativas: "Cooperatives",
  "Moda e Vestuário": "Fashion and Apparel",
  "Operadoras de Planos de Saúde": "Health Plan Operators",
  "Papel e Celulose": "Pulp and Paper",
  Educação: "Education",
};

export function sectorName(sector: string, lang: Lang): string {
  return lang === "en" ? (SECTOR_EN[sector] ?? sector) : sector;
}
