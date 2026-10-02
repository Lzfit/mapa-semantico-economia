import { Footer } from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import { MapExperience } from "@/components/MapExperience";
import { loadCompanies } from "@/lib/companies";
import { parseLang } from "@/lib/i18n";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const { lang } = await searchParams;
  const companies = loadCompanies();

  return (
    <LanguageProvider initialLang={parseLang(lang)}>
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 py-8 md:px-10 lg:gap-4 lg:py-5 short:gap-2.5 short:py-3 tshort:gap-2.5 tshort:py-1.5">
        <MapExperience companies={companies} />
        <Footer />
      </main>
    </LanguageProvider>
  );
}
