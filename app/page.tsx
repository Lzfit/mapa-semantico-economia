import { Footer } from "@/components/Footer";
import { MapExperience } from "@/components/MapExperience";
import { loadCompanies } from "@/lib/companies";

export default function Home() {
  const companies = loadCompanies();

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 py-8 md:px-10 lg:gap-4 lg:py-5 short:gap-2.5 short:py-3 tshort:gap-2.5 tshort:py-1.5">
      <MapExperience companies={companies} />
      <Footer />
    </main>
  );
}
