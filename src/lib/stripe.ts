import "server-only";
import Stripe from "stripe";
import type { Interval, PlanId } from "./plans";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { typescript: true });
  }
  return _stripe;
}

// Price IDs come from env (created by scripts/stripe-setup.mjs).
const PRICE_ENV: Record<Exclude<PlanId, "free">, Record<Interval, string>> = {
  hobby: { month: "STRIPE_PRICE_HOBBY_MONTHLY", year: "STRIPE_PRICE_HOBBY_YEARLY" },
  pro: { month: "STRIPE_PRICE_PRO_MONTHLY", year: "STRIPE_PRICE_PRO_YEARLY" },
};

export function priceIdFor(plan: Exclude<PlanId, "free">, interval: Interval): string {
  const id = process.env[PRICE_ENV[plan][interval]];
  if (!id) throw new Error(`Missing env ${PRICE_ENV[plan][interval]}`);
  return id;
}

export function planFromPriceId(priceId: string | null | undefined): { plan: Exclude<PlanId, "free">; interval: Interval } | null {
  if (!priceId) return null;
  for (const plan of ["hobby", "pro"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (process.env[PRICE_ENV[plan][interval]] === priceId) return { plan, interval };
    }
  }
  return null;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_HOBBY_MONTHLY && process.env.STRIPE_PRICE_PRO_MONTHLY);
}
