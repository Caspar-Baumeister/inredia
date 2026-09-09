// Plans, limits and prices — the single place that knows what free/hobby/pro mean.
// Prices are in EUR cents; Stripe price IDs live in env (see scripts/stripe-setup.mjs).

export type PlanId = "free" | "hobby" | "pro";
export type Interval = "month" | "year";

export type PlanDef = {
  id: PlanId;
  name: string;
  tagline: string;
  /** images per day (paid) */
  dailyImages: number | null;
  /** lifetime images (free) */
  totalImages: number | null;
  projects: number | null; // null = unlimited
  price: { month: number; year: number } | null; // cents
  features: string[];
};

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try it on one listing.",
    dailyImages: null,
    totalImages: Number(process.env.NEXT_PUBLIC_FREE_IMAGE_LIMIT || 50),
    projects: 1,
    price: null,
    features: ["50 images in total", "1 project", "All styles & budgets", "Google sign-in, no card"],
  },
  hobby: {
    id: "hobby",
    name: "Hobby",
    tagline: "For your own flat or the occasional deal.",
    dailyImages: 20,
    totalImages: null,
    projects: 3,
    price: { month: 1900, year: 14900 },
    features: ["20 images every day", "3 projects", "Edits & chat changes", "Library & downloads"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For investors, agents and stagers.",
    dailyImages: 200,
    totalImages: null,
    projects: null,
    price: { month: 5900, year: 49000 },
    features: ["200 images every day", "Unlimited projects", "Priority generation", "Early access to new models"],
  },
};

export const PAID_PLANS: Exclude<PlanId, "free">[] = ["hobby", "pro"];

export function formatPrice(cents: number, interval: Interval): string {
  const eur = cents / 100;
  const perMonth = interval === "year" ? eur / 12 : eur;
  return `${perMonth.toLocaleString("de-DE", { minimumFractionDigits: perMonth % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`;
}

export function yearlySaving(plan: PlanDef): number {
  if (!plan.price) return 0;
  return Math.round((1 - plan.price.year / (plan.price.month * 12)) * 100);
}

// A profile row as far as billing is concerned.
export type BillingProfile = {
  plan?: PlanId | null;
  plan_status?: string | null;
  current_period_end?: string | null;
  images_total?: number | null;
  daily_image_count?: number | null;
  daily_count_reset_at?: string | null;
};

const ACTIVE = new Set(["active", "trialing", "past_due"]);

// Effective plan: paid only while Stripe says the subscription is alive (past_due
// gets a grace period until the period end has passed).
export function effectivePlan(p: BillingProfile | null | undefined): PlanId {
  if (!p || !p.plan || p.plan === "free") return "free";
  if (!ACTIVE.has(p.plan_status ?? "")) return "free";
  if (p.plan_status === "past_due" && p.current_period_end && new Date(p.current_period_end) < new Date()) return "free";
  return p.plan;
}

export function limitFor(plan: PlanId): { limit: number; mode: "total" | "daily" } {
  const def = PLANS[plan];
  return def.dailyImages != null ? { limit: def.dailyImages, mode: "daily" } : { limit: def.totalImages ?? 0, mode: "total" };
}

export function usageFor(p: BillingProfile | null | undefined): { used: number; limit: number; mode: "total" | "daily"; plan: PlanId } {
  const plan = effectivePlan(p);
  const { limit, mode } = limitFor(plan);
  if (mode === "daily") {
    const resetToday = p?.daily_count_reset_at && new Date(p.daily_count_reset_at) >= new Date(new Date().setHours(0, 0, 0, 0));
    return { used: Math.min(limit, resetToday ? Number(p?.daily_image_count ?? 0) : 0), limit, mode, plan };
  }
  return { used: Math.min(limit, Number(p?.images_total ?? 0)), limit, mode, plan };
}

export function projectLimitFor(plan: PlanId): number {
  return PLANS[plan].projects ?? Number.MAX_SAFE_INTEGER;
}
