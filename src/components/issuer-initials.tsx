import { brandOf } from "@/lib/etfs/brands";

/** Client-safe issuer mark: logo file if the brand has one, with initials behind it if the file is absent. */
export function IssuerInitials({ name }: { name: string }) {
  const brand = brandOf(name);
  const initials = (brand?.label ?? name).replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span aria-hidden className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-sunken text-[0.7rem] font-bold text-pine">
      {initials}
      {brand ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/v1/logo/${brand.slug}`} alt="" width={22} height={22} loading="lazy" className="absolute inset-0 m-auto bg-surface" />
      ) : null}
    </span>
  );
}
