import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";
import { effectivePlan, limitFor, projectLimitFor, type BillingProfile, type PlanId } from "./plans";

const BILLING_COLUMNS = "plan, plan_status, plan_interval, current_period_end, cancel_at_period_end, stripe_customer_id, images_total, daily_image_count, daily_count_reset_at";

export async function loadBillingProfile(userId: string): Promise<BillingProfile & { stripe_customer_id?: string | null; plan_interval?: string | null; cancel_at_period_end?: boolean }> {
  const { data } = await getSupabaseAdmin().from("profiles").select(BILLING_COLUMNS).eq("id", userId).maybeSingle();
  return (data ?? {}) as BillingProfile;
}

export async function planForUser(userId: string): Promise<PlanId> {
  return effectivePlan(await loadBillingProfile(userId));
}

// Reserves `count` images against the user's plan. Returns the remaining allowance
// or -1 when the limit is hit. Negative counts refund.
export async function reserveImages(userId: string, count: number): Promise<number> {
  const plan = await planForUser(userId);
  const { limit, mode } = limitFor(plan);
  const { data, error } = await getSupabaseAdmin().rpc("reserve_images", { p_user: userId, p_count: count, p_limit: limit, p_mode: mode });
  if (error) {
    console.error("reserve_images failed", error);
    return -1;
  }
  return data as number;
}

export async function canCreateProject(userId: string, currentCount: number): Promise<boolean> {
  return currentCount < projectLimitFor(await planForUser(userId));
}
