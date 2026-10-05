import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { LanguageProvider } from "@/components/LanguageProvider";
import { MapExperience } from "@/components/MapExperience";
import { loadCompanies } from "@/lib/companies";
import { parseLang } from "@/lib/i18n";
import { buildMetadata } from "@/lib/siteMetadata";

type SearchParams = Promise<{ lang?: string | string[] }>;

/** Metadata e Open Graph no idioma da URL (`?lang=en` → inglês; padrão português). */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  return buildMetadata(parseLang(lang));
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { lang } = await searchParams;
  const initialLang = parseLang(lang);
  const companies = loadCompanies();

  return (
    <LanguageProvider initialLang={initialLang}>
      <GoogleAnalytics lang={initialLang} />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 py-8 md:px-10 lg:gap-4 lg:py-5 short:gap-2.5 short:py-3 tshort:gap-2.5 tshort:py-1.5 max-md:px-4 max-md:pt-[1.125rem] max-md:pb-7">
        <MapExperience companies={companies} />
        <Footer />
      </main>
    </LanguageProvider>
  );
}
