import type { MetadataRoute } from "next";

/** Lets a phone add the site to its home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ETF Intelligence", short_name: "ETF Intelligence",
    description: "Find, compare and understand ETFs, with a source and a date behind every figure.",
    start_url: "/", display: "standalone", background_color: "#f5f9ff", theme_color: "#1a8cff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
