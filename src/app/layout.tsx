import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { CompareTray } from "@/components/compare-tray";
import { themeScript } from "@/components/theme-toggle";
import { LangProvider } from "@/lib/i18n/client";
import { alternatesFor, getT } from "@/lib/i18n/server";
import { Suspense } from "react";
import { Motion } from "@/components/motion";
import { Welcome } from "@/components/welcome";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: "ETF Intelligence", template: "%s, ETF Intelligence" },
    description: t("Find, compare and understand ETFs from every major market, with a source and a date behind every figure. In English and French."),
    openGraph: { siteName: "ETF Intelligence", type: "website", locale: t.lang === "fr" ? "fr_FR" : "en_GB" },
    alternates: await alternatesFor(),
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getT();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Suspense><Motion /></Suspense>
        <LangProvider lang={lang}>
          <Shell>{children}</Shell>
          <CompareTray />
          <Welcome />
        </LangProvider>
      </body>
    </html>
  );
}
