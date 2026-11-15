import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Shell } from "@/components/shell";
import { CompareTray } from "@/components/compare-tray";
import { themeScript } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: { default: "ETF Intelligence", template: "%s, ETF Intelligence" },
  description: "Find, compare and understand UCITS ETFs, with a source and a date behind every figure.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Shell>{children}</Shell>
        <CompareTray />
      </body>
    </html>
  );
}
