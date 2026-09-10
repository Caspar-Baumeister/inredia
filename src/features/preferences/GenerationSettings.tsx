"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { QUALITY_MODES, STACK_SIZES, type QualityMode, type StackSize } from "@/lib/types";
import { cn } from "@/lib/utils";
import { updateGenerationSettingsAction } from "./actions";

export function GenerationSettings({ stackSize, quality }: { stackSize: StackSize; quality: QualityMode }) {
  const [size, setSize] = useState<StackSize>(stackSize);
  const [q, setQ] = useState<QualityMode>(quality);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save(next: { size?: StackSize; quality?: QualityMode }) {
    const s = next.size ?? size;
    const nq = next.quality ?? q;
    setSize(s);
    setQ(nq);
    setSaved(false);
    start(async () => {
      await updateGenerationSettingsAction({ stackSize: s, quality: nq });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5 card-shadow lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Generation</h2>
          <p className="text-xs text-muted-foreground">How many options you get per room, and which model draws them.</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {pending ? <Loader2 size={14} className="animate-spin" /> : saved ? <span className="text-success">Saved</span> : null}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Options per room</p>
          <div className="flex gap-2">
            {STACK_SIZES.map((n) => (
              <button
                key={n}
                onClick={() => save({ size: n })}
                className={cn(
                  "h-11 flex-1 rounded-xl border text-sm font-medium transition-colors",
                  size === n ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            More options means more choice, but each one is an image from your quota and the first one takes a moment longer.
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Image model</p>
          <div className="space-y-2">
            {QUALITY_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => save({ quality: m.id })}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                  q === m.id ? "border-foreground bg-muted/60" : "hover:bg-muted",
                )}
              >
                <span className={cn("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border", q === m.id && "border-foreground bg-foreground text-background")}>
                  {q === m.id && <Check size={11} />}
                </span>
                <span>
                  <span className="block text-sm font-medium">
                    {m.label}
                    {m.cost > 1 && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground">counts as {m.cost} images</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground">{m.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
