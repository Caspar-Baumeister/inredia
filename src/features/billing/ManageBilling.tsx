"use client";

import { useTransition } from "react";
import { openPortalAction } from "./actions";
import { usePro } from "@/features/pro/UpgradeDialog";

export function ManageBilling({ hasCustomer, plan }: { hasCustomer: boolean; plan: string }) {
  const [pending, start] = useTransition();
  const { openPro } = usePro();
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {plan === "free" || !hasCustomer ? (
        <button onClick={() => openPro("upgrade")} className="rounded-lg bg-foreground px-3 py-1.5 text-sm text-white hover:bg-foreground/90">
          Upgrade
        </button>
      ) : (
        <button onClick={() => start(() => openPortalAction())} disabled={pending} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
          {pending ? "Opening…" : "Manage billing"}
        </button>
      )}
      {plan !== "free" && plan !== "pro" && (
        <button onClick={() => openPro("upgrade")} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">
          Change plan
        </button>
      )}
    </div>
  );
}
