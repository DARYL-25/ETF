import { NextResponse, type NextRequest } from "next/server";
import { billingConfigured, createCheckout } from "@/lib/billing/stripe";
import { currentUser } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  if (!billingConfigured()) return NextResponse.redirect(`${site}/pricing?state=off`, 303);
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${site}/login?next=/pricing`, 303);
  const form = await request.formData();
  try {
    const session = await createCheckout({ userId: user.id, email: user.email, yearly: form.get("interval") === "year", site });
    return NextResponse.redirect(session.url, 303);
  } catch {
    return NextResponse.redirect(`${site}/pricing?state=error`, 303);
  }
}
