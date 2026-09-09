import { type NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabase } from "@/lib/supabase/server";
import { syncFromCheckoutSession } from "@/lib/stripe-sync";

export const runtime = "nodejs";

// Stripe's success_url: sync the plan before the user lands back in the app, so the
// new limit applies immediately even if the webhook is late.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const target = new URL("/settings?upgraded=1", origin);
  if (!sessionId) return NextResponse.redirect(target);

  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    if (session.metadata?.user_id === user.id) await syncFromCheckoutSession(session);
  } catch (err) {
    console.error("[checkout-return] sync failed", err);
  }
  return NextResponse.redirect(target);
}
