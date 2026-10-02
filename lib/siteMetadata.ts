import type { Metadata } from "next";
import type { Lang } from "./i18n";

/** URL pública de produção (canonical e base das URLs absolutas de Open Graph). */
export const SITE_URL = "https://mapa-semantico-economia.vercel.app";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

interface SiteCopy {
  title: string;
  description: string;
  /** Frase curta da imagem social. */
  tagline: string;
  /** `og:locale`. */
  locale: string;
}

export const SITE_COPY: Record<Lang, SiteCopy> = {
  pt: {
    title: "Mapa Semântico da Economia Brasileira",
    description:
      "Explore como temas, mercados e tendências se conectam às 1.000 maiores empresas do Brasil.",
    tagline: "Veja que partes da economia brasileira se acendem.",
    locale: "pt_BR",
  },
  en: {
    title: "Semantic Map of the Brazilian Economy",
    description:
      "Explore how topics, markets and trends connect to Brazil’s 1,000 largest companies.",
    tagline: "See which parts of Brazil’s economy light up.",
    locale: "en_US",
  },
};

/** URL absoluta da página em cada idioma: português na raiz, inglês com `?lang=en`. */
export const pageUrl = (lang: Lang) => `${SITE_URL}/${lang === "en" ? "?lang=en" : ""}`;

/** Imagem social estática por idioma (gerada em build por `app/og/[file]/route.tsx`). */
export const ogImagePath = (lang: Lang) => `/og/${lang}.png`;

export function buildMetadata(lang: Lang): Metadata {
  const copy = SITE_COPY[lang];
  const url = pageUrl(lang);
  const image = {
    url: ogImagePath(lang),
    ...OG_IMAGE_SIZE,
    alt: copy.title,
    type: "image/png",
  };
  return {
    metadataBase: new URL(SITE_URL),
    title: copy.title,
    description: copy.description,
    applicationName: copy.title,
    alternates: {
      canonical: url,
      languages: {
        "pt-BR": pageUrl("pt"),
        en: pageUrl("en"),
        "x-default": pageUrl("pt"),
      },
    },
    openGraph: {
      type: "website",
      url,
      siteName: copy.title,
      title: copy.title,
      description: copy.description,
      locale: copy.locale,
      alternateLocale: [SITE_COPY[lang === "en" ? "pt" : "en"].locale],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}
