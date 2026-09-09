import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { logoutAction } from "@/app/auth/actions";
import { FeedbackCard } from "@/components/app/FeedbackCard";
import { loadBillingProfile } from "@/lib/billing";
import { PLANS, usageFor } from "@/lib/plans";
import { ManageBilling } from "@/features/billing/ManageBilling";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;
  const profile = await loadBillingProfile(user.id);
  const usage = usageFor(profile);
  const def = PLANS[usage.plan];
  const renew = profile.current_period_end ? new Date(profile.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <main className="flex-1 px-6 py-6">
      <h1 className="mb-6 text-lg font-semibold">Settings</h1>
      <div className="max-w-lg space-y-4">
        {params.upgraded && (
          <p className="rounded-xl border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">Welcome aboard — your new plan is active.</p>
        )}
        <section className="rounded-xl border bg-card p-5 card-shadow">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Plan</h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">{def.name}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {usage.mode === "daily" ? `${usage.used} of ${usage.limit} images used today · refills at midnight` : `${usage.used} of ${usage.limit} images used in total`}
            {renew && usage.plan !== "free" && ` · ${profile.cancel_at_period_end ? "ends" : "renews"} ${renew}`}
            {profile.plan_status === "past_due" && " · payment failed — please update your card"}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }} />
          </div>
          <ManageBilling hasCustomer={Boolean(profile.stripe_customer_id)} plan={usage.plan} />
        </section>
        <section className="rounded-xl border bg-card p-5 card-shadow">
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          <form action={logoutAction} className="mt-3">
            <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Sign out</button>
          </form>
        </section>
        <FeedbackCard />
      </div>
    </main>
  );
}
