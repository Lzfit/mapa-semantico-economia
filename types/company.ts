export interface Company {
  /** `exame2026_0001` … `exame2026_1000` */
  id: string;
  /** `posicao_receita` no ranking EXAME (1–1000). */
  rank: number;
  /** Nome exibido. Para entidade não divulgada: "Empresa não divulgada". */
  name: string;
  /** Linha anonimizada pela fonte (ex.: `***(2)`); não é enviada ao Jev. */
  undisclosed: boolean;
  sector: string;
  city: string | null;
  state: string | null;
  /** Valores-fonte em milhares de reais; `null` quando a fonte não os traz. */
  revenue2025ThousandsBRL: number | null;
  revenue2024ThousandsBRL: number | null;
  netProfit2025ThousandsBRL: number | null;
  equity2025ThousandsBRL: number | null;
  totalAssets2025ThousandsBRL: number | null;
  pdfPage: number | null;
}
