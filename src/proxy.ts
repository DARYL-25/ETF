import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Two jobs on every page request.
 * French addresses: /fr/screener shows the same page as /screener, in French, so search engines can
 * index both languages. The page learns its language and its own path from two request headers.
 * Sign-in: keeps the Supabase session cookie fresh. Skipped until Supabase is configured.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const french = pathname === "/fr" || pathname.startsWith("/fr/");
  const path = french ? pathname.slice(3) || "/" : pathname;
  const headers = new Headers(request.headers);
  headers.set("x-path", path);
  if (french) headers.set("x-lang", "fr"); else headers.delete("x-lang");

  const forward = () => {
    if (!french) return NextResponse.next({ request: { headers } });
    const target = request.nextUrl.clone();
    target.pathname = path;
    const response = NextResponse.rewrite(target, { request: { headers } });
    // A reader who arrives on a French address keeps French on the pages they open next.
    response.cookies.set("lang", "fr", { path: "/", maxAge: 31536000, sameSite: "lax" });
    return response;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return forward();

  let response = forward();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = forward();
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|logos/|.*\\.(?:png|svg|ico|txt|xml|webmanifest)$).*)"],
};
