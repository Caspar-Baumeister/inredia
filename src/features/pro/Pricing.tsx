"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice, PAID_PLANS, PLANS, yearlySaving, type Interval, type PlanId } from "@/lib/plans";
import { SITE } from "@/lib/site";

// Plan picker used in the in-app dialog and on /pricing. `onChoose` starts checkout
// (or, for logged-out visitors, sends them to sign in first).
export function Pricing({
  currentPlan,
  onChoose,
  busy,
  compact = false,
  dark = false,
}: {
  currentPlan: PlanId;
  onChoose: (plan: Exclude<PlanId, "free">, interval: Interval) => void;
  busy?: PlanId | null;
  compact?: boolean;
  dark?: boolean;
}) {
  const [interval, setInterval] = React.useState<Interval>("year");
  const ink = dark ? "text-ink" : "text-foreground";
  const muted = dark ? "text-ink/60" : "text-muted-foreground";

  return (
    <div className={cn("space-y-5", ink)}>
      <div className="flex items-center justify-center gap-1 rounded-full border p-1 text-sm" style={{ borderColor: dark ? "rgba(28,25,21,0.15)" : undefined }}>
        {(["month", "year"] as Interval[]).map((i) => (
          <button
            key={i}
            onClick={() => setInterval(i)}
            className={cn("rounded-full px-4 py-1.5 transition-colors", interval === i ? (dark ? "bg-ink text-paper" : "bg-foreground text-white") : muted)}
          >
            {i === "month" ? "Monthly" : "Yearly"}
            {i === "year" && <span className={cn("ml-1.5 text-[11px]", interval === i ? "opacity-80" : "text-honey")}>save {yearlySaving(PLANS.pro)}%</span>}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-4", compact ? "sm:grid-cols-2" : "md:grid-cols-2")}>
        {PAID_PLANS.map((id) => {
          const p = PLANS[id];
          const isCurrent = currentPlan === id;
          const highlight = id === "pro";
          return (
            <div
              key={id}
              className={cn(
                "flex flex-col rounded-2xl border p-5",
                dark ? "border-ink/15 bg-white/60" : "bg-card",
                highlight && (dark ? "border-honey/60 shadow-[0_18px_40px_-16px_rgba(184,103,42,0.35)]" : "border-foreground/40"),
              )}
            >
              <div className="flex items-baseline justify-between">
                <h3 className={cn("text-lg font-semibold", dark && "font-display text-2xl font-normal")}>{p.name}</h3>
                {highlight && <span className="rounded-full bg-honey/15 px-2 py-0.5 text-[11px] font-medium text-honey">Most popular</span>}
              </div>
              <p className={cn("mt-0.5 text-sm", muted)}>{p.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className={cn("text-3xl font-semibold", dark && "font-display font-normal text-4xl")}>{formatPrice(p.price!.year && interval === "year" ? p.price!.year : p.price!.month, interval)}</span>
                <span className={cn("text-sm", muted)}>/ month</span>
              </div>
              <p className={cn("text-xs", muted)}>{interval === "year" ? `billed ${(p.price!.year / 100).toLocaleString("de-DE")} € per year` : "billed monthly · cancel anytime"}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-honey" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={isCurrent || Boolean(busy)}
                onClick={() => onChoose(id, interval)}
                className={cn(
                  "mt-5 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-transform disabled:opacity-60",
                  highlight || dark ? "bg-ink text-paper hover:-translate-y-0.5" : "border hover:bg-muted",
                  dark && !highlight && "border border-ink/20 bg-transparent text-ink",
                )}
              >
                {isCurrent ? "Your current plan" : busy === id ? "Opening checkout…" : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className={cn("text-center text-xs", muted)}>
        Prices incl. VAT. Free plan: {PLANS.free.totalImages} images in total, one project. Questions? Message {SITE.founder} on X{" "}
        <a href={SITE.xUrl} target="_blank" rel="noreferrer" className="underline decoration-honey underline-offset-2">
          {SITE.xHandle}
        </a>
        .
      </p>
    </div>
  );
}
