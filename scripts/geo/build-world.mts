// Builds the world map used for exposure maps: Natural Earth 1:110m countries from world-atlas, projected once
// with the Equal Earth projection into a 960×470 box, so pages draw it as plain SVG with no map code in the browser.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoEqualEarth, geoPath } from "d3-geo";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("world-atlas/countries-110m.json"), "utf8"));
const land = feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection<GeoJSON.Geometry, { name: string }>;
land.features = land.features.filter((f) => f.properties.name !== "Antarctica");
const projection = geoEqualEarth().fitExtent([[4, 4], [956, 466]], land);
const path = geoPath(projection);
const round = (d: string) => d.replace(/(\d+\.\d{1})\d+/g, "$1");
const countries = land.features.map((f) => {
  const [cx, cy] = path.centroid(f);
  return { id: String(f.id ?? f.properties.name), name: f.properties.name, d: round(path(f) ?? ""), c: [Math.round(cx), Math.round(cy)] };
}).filter((c) => c.d);
// Places too small to see at this scale, drawn as dots where they are.
const dots: Record<string, [number, number]> = { "Hong Kong": [114.17, 22.32], Singapore: [103.82, 1.35], Luxembourg: [6.13, 49.61], Malta: [14.4, 35.9], Bermuda: [-64.78, 32.3], Bahrain: [50.56, 26.07], Qatar: [51.18, 25.35], "Cayman Islands": [-81.25, 19.31], Guernsey: [-2.58, 49.45], Jersey: [-2.13, 49.21], Monaco: [7.42, 43.74], Liechtenstein: [9.55, 47.16], Mauritius: [57.55, -20.35], Macao: [113.54, 22.2] };
const points = Object.entries(dots).map(([name, ll]) => { const p = projection(ll)!; return { name, c: [Math.round(p[0]), Math.round(p[1])] }; });
writeFileSync("src/lib/geo/world.json", JSON.stringify({ width: 960, height: 470, countries, points }));
console.log(countries.length, "countries,", points.length, "dots");
