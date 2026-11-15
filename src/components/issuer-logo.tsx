import { existsSync } from "node:fs";
import { join } from "node:path";
import { brandOf } from "@/lib/etfs/brands";

const fileFor = (slug: string) => {
  for (const ext of ["png", "ico", "svg"]) {
    if (existsSync(join(process.cwd(), "public/logos", `${slug}.${ext}`))) return `/logos/${slug}.${ext}`;
  }
  return null;
};

/** Issuer's own icon when we hold one, otherwise neutral initials. Never redrawn by hand. */
export function IssuerLogo({ name }: { name: string }) {
  const brand = brandOf(name);
  const file = brand ? fileFor(brand.slug) : null;
  const box = "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-surface";
  if (file) {
    // eslint-disable-next-line @next/next/no-img-element
    return <span className={box}><img src={file} alt={`${brand!.label} logo`} width={22} height={22} loading="lazy" /></span>;
  }
  const initials = (brand?.label ?? name).replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span aria-hidden className={`${box} bg-sunken text-[0.7rem] font-bold text-pine`}>{initials}</span>;
}
