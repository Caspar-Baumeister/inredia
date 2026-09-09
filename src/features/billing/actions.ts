"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured, priceIdFor } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/url";
import type { Interval, PlanId } from "@/lib/plans";

async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data } = await admin.from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const customer = await getStripe().customers.create({ email, metadata: { user_id: userId } });
  await admin.from("profiles").upsert({ id: userId, stripe_customer_id: customer.id }, { onConflict: "id" });
  return customer.id;
}

// Starts Stripe Checkout for a paid plan. Returns the URL (the client navigates).
export async function startCheckoutAction(input: { plan: Exclude<PlanId, "free">; interval: Interval }): Promise<{ url: string }> {
  if (!isStripeConfigured()) throw new Error("Billing is not set up yet. Please try again later.");
  const { user } = await requireUser();
  const customer = await getOrCreateCustomer(user.id, user.email ?? "");
  const base = await getBaseUrl();
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    line_items: [{ price: priceIdFor(input.plan, input.interval), quantity: 1 }],
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    success_url: `${base}/api/billing/checkout-return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/settings`,
    allow_promotion_codes: true,
    customer_update: { address: "auto" },
    automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "1" },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url };
}

// Opens the Stripe customer portal (change plan, cancel, invoices).
export async function openPortalAction(): Promise<void> {
  const { user, sb } = await requireUser();
  const { data } = await sb.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) redirect("/settings");
  const base = await getBaseUrl();
  const session = await getStripe().billingPortal.sessions.create({ customer: data.stripe_customer_id as string, return_url: `${base}/settings` });
  redirect(session.url);
}
