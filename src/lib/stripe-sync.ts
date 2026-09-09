import "server-only";
import type Stripe from "stripe";
import { getStripe, planFromPriceId } from "./stripe";
import { getSupabaseAdmin } from "./supabase/admin";

type ProfileUpdate = {
  plan?: "free" | "hobby" | "pro";
  plan_status?: string | null;
  plan_interval?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
};

const ENDED = new Set(["canceled", "unpaid", "incomplete_expired"]);

export function subscriptionToUpdate(sub: Stripe.Subscription): ProfileUpdate {
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const resolved = planFromPriceId(priceId);
  const periodEndSec =
    (item as unknown as { current_period_end?: number } | undefined)?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const ended = ENDED.has(sub.status);
  return {
    plan: ended ? "free" : (resolved?.plan ?? "free"),
    plan_status: sub.status,
    plan_interval: resolved?.interval ?? item?.price?.recurring?.interval ?? null,
    stripe_subscription_id: ended ? null : sub.id,
    current_period_end: periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  };
}

export async function updateProfileByCustomer(customerId: string, update: ProfileUpdate) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("profiles").update(update).eq("stripe_customer_id", customerId);
  if (error) console.error("[stripe] profile update failed", error);
}

// Writes the plan for a completed Checkout Session. Called from the return URL
// (synchronous) and the webhook (backstop) — idempotent.
export async function syncFromCheckoutSession(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subField = session.subscription;
  const subId = typeof subField === "string" ? subField : subField?.id;
  if (!userId || !customerId || !subId) return;
  const subscription = subField && typeof subField !== "string" ? (subField as Stripe.Subscription) : await getStripe().subscriptions.retrieve(subId);
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("profiles")
    .upsert({ id: userId, stripe_customer_id: customerId, ...subscriptionToUpdate(subscription) }, { onConflict: "id" });
  if (error) console.error("[stripe] checkout sync failed", error);
}
