import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const authConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Runs as the signed-in user, so Row Level Security applies to every private query. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items) store.set(name, value, options);
        } catch {
          // Server components cannot set cookies. src/proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

export async function currentUser() {
  if (!authConfigured()) return null;
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
