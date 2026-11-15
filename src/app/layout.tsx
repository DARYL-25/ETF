import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { CompareTray } from "@/components/compare-tray";
import { themeScript } from "@/components/theme-toggle";
import { LangProvider } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { default: "ETF Intelligence", template: "%s, ETF Intelligence" },
  description: "Find, compare and understand UCITS ETFs, with a source and a date behind every figure.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang } = await getT();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <LangProvider lang={lang}>
          <Shell>{children}</Shell>
          <CompareTray />
        </LangProvider>
      </body>
    </html>
  );
}
