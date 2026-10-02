import type { Metadata } from "next";
import { SITE_COPY, SITE_URL } from "@/lib/siteMetadata";
import "./globals.css";

/** Padrão do site; a página `/` refina por idioma em `generateMetadata`. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_COPY.pt.title,
  description: SITE_COPY.pt.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
