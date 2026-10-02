import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
import type { Lang } from "@/lib/i18n";

/** GA4 via gtag.js; o page_view automático leva só o idioma da interface. */
export function GoogleAnalytics({ lang }: { lang: Lang }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { ui_language: '${lang}' });`}
      </Script>
    </>
  );
}
