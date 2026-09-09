"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Pricing } from "./Pricing";
import { startCheckoutAction } from "@/features/billing/actions";
import type { Interval, PlanId } from "@/lib/plans";
import { PLANS } from "@/lib/plans";

// Global "upgrade" dialog. Opened from the sidebar, the image-limit card, the
// project switcher and edit/limit toasts.
export type ProSource = "upgrade" | "image_limit" | "new_project" | "other";

type Ctx = { openPro: (source: ProSource) => void; plan: PlanId };
const ProContext = React.createContext<Ctx>({ openPro: () => {}, plan: "free" });

export function usePro() {
  return React.useContext(ProContext);
}

const TITLES: Record<ProSource, (plan: PlanId) => string> = {
  upgrade: () => "Choose your plan",
  image_limit: (plan) => (plan === "free" ? `You've used your ${PLANS.free.totalImages} free images` : "Today's images are used up"),
  new_project: (plan) => (plan === "free" ? "More projects need a plan" : "Your project limit is reached"),
  other: () => "inredia plans",
};

export function ProProvider({ children, plan }: { children: React.ReactNode; userEmail?: string; plan: PlanId }) {
  const [source, setSource] = React.useState<ProSource | null>(null);
  const [busy, setBusy] = React.useState<PlanId | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const openPro = React.useCallback((s: ProSource) => {
    setSource(s);
    setError(null);
  }, []);

  async function choose(p: Exclude<PlanId, "free">, interval: Interval) {
    setBusy(p);
    setError(null);
    try {
      const { url } = await startCheckoutAction({ plan: p, interval });
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const subtitle =
    source === "image_limit"
      ? plan === "free"
        ? "Paid plans refill every day."
        : "Your allowance refills at midnight — or move up a plan for more."
      : source === "new_project"
        ? "Hobby includes 3 projects, Pro has no limit."
        : "Cancel anytime. Prices include VAT.";

  return (
    <ProContext.Provider value={{ openPro, plan }}>
      {children}
      <Dialog open={Boolean(source)} onClose={() => setSource(null)} title={source ? TITLES[source](plan) : ""} className="max-w-2xl">
        <p className="-mt-2 mb-4 text-sm text-muted-foreground">{subtitle}</p>
        <Pricing currentPlan={plan} onChoose={choose} busy={busy} compact />
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </Dialog>
    </ProContext.Provider>
  );
}
