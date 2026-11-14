"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { LENS_COOKIE, LENS_COUNTRIES, lensCountry } from "@/lib/lens";

/** Where you live. Sets a cookie so pages can show what matters for that country. Never guessed. */
export function LensPicker({ current }: { current: string | null }) {
  const router = useRouter();
  const details = useRef<HTMLDetailsElement>(null);
  const country = lensCountry(current);
  const choose = (code: string) => {
    document.cookie = code ? `${LENS_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax` : `${LENS_COOKIE}=; path=/; max-age=0`;
    if (details.current) details.current.open = false;
    router.refresh();
  };
  return (
    <details ref={details} className="relative">
      <summary className="chip list-none" aria-label={country ? `You invest from ${country.name}. Change country` : "Choose the country you invest from"}>
        <MapPin size={14} aria-hidden />
        <span className="hidden sm:inline">{country ? country.name : "Your country"}</span>
        <span className="sm:hidden">{country ? country.code : "Country"}</span>
      </summary>
      <div className="panel absolute right-0 top-full z-50 mt-2 w-64 p-2 shadow-xl">
        <p className="px-2 pb-1.5 pt-1 text-[0.85rem] text-muted">Pick where you live, and pages show what matters there. We never guess it from your location.</p>
        <ul className="max-h-72 overflow-y-auto">
          {LENS_COUNTRIES.map((c) => (
            <li key={c.code}>
              <button type="button" onClick={() => choose(c.code)} aria-pressed={c.code === country?.code} className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-sunken ${c.code === country?.code ? "font-semibold text-pine" : ""}`}>
                {c.name}{c.tax ? <span className="text-[0.75rem] font-normal text-muted">tax notes</span> : null}
              </button>
            </li>
          ))}
          {country ? <li><button type="button" onClick={() => choose("")} className="w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-muted hover:bg-sunken">Clear</button></li> : null}
        </ul>
      </div>
    </details>
  );
}
