import { NextResponse, type NextRequest } from "next/server";
import { createPortal } from "@/lib/billing/stripe";
import { currentPlan } from "@/lib/billing/plan";

export async function POST(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const { customerId } = await currentPlan();
  if (!customerId) return NextResponse.redirect(`${site}/pricing`, 303);
  try {
    return NextResponse.redirect((await createPortal(customerId, site)).url, 303);
  } catch {
    return NextResponse.redirect(`${site}/profile?billing=error`, 303);
  }
}
