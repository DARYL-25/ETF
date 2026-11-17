import { OG_SIZE, ogCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ETF Intelligence";

export default function Image() {
  return ogCard({ title: "Find the right ETF, and see why.", line: "Every ETF from every major market, with a source and a date behind every figure." });
}
