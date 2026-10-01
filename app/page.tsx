import { AssociationRanking } from "@/components/AssociationRanking";
import { ColorLegend } from "@/components/ColorLegend";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ModelQuestion } from "@/components/ModelQuestion";
import { SearchBar } from "@/components/SearchBar";
import { SectorMosaic } from "@/components/SectorMosaic";
import { loadCompanies } from "@/lib/companies";

const INITIAL_THEME = "data centers";

export default function Home() {
  const companies = loadCompanies();

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-7 px-5 py-8 md:px-10">
      <Header />
      <SearchBar initialValue={INITIAL_THEME} />
      <div className="flex flex-col gap-5">
        <ModelQuestion theme={INITIAL_THEME} />
        <ColorLegend />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
        <div className="order-2 min-w-0 lg:order-1">
          <SectorMosaic companies={companies} />
        </div>
        <aside className="order-1 lg:order-2">
          <AssociationRanking />
        </aside>
      </div>
      <Footer />
    </main>
  );
}
