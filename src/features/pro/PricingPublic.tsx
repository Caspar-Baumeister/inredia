"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pricing } from "./Pricing";
import { startCheckoutAction } from "@/features/billing/actions";
import type { Interval, PlanId } from "@/lib/plans";

export function PricingPublic({ currentPlan, signedIn }: { currentPlan: PlanId; signedIn: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function choose(plan: Exclude<PlanId, "free">, interval: Interval) {
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    setBusy(plan);
    try {
      const { url } = await startCheckoutAction({ plan, interval });
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }
  return (
    <>
      <Pricing currentPlan={currentPlan} onChoose={choose} busy={busy} dark />
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </>
  );
}
