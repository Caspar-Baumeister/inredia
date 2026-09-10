"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { onboardingProgressAction, type OnboardingProgress } from "./actions";

const STEPS = [
  { key: "plan", label: "Reading your rooms and writing the furnishing plan" },
  { key: "first", label: "Rendering your first room" },
  { key: "stack", label: "Filling the stack and starting the other rooms" },
] as const;

// Shown right after the wizard: the plan and the first images are built here so
// the dashboard never opens on an empty, loading screen.
export function Preparing({ projectId, photoId }: { projectId: string; photoId: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [seconds, setSeconds] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    let stop = false;
    async function tick() {
      try {
        const p = await onboardingProgressAction({ projectId, photoId });
        if (stop) return;
        setProgress(p);
        if ((p.ready > 0 || p.limitReached || p.planStatus === "failed") && !done.current) {
          done.current = true;
          router.replace("/dashboard");
          return;
        }
      } catch (e) {
        console.error(e);
      }
      if (!stop) window.setTimeout(tick, 2500);
    }
    tick();
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [projectId, photoId, router]);

  const stage = progress == null || progress.planStatus !== "ready" ? 0 : progress.ready > 0 ? 2 : 1;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-6 py-10">
      <div className="rounded-2xl border bg-card p-8 card-shadow">
        <h1 className="text-xl font-semibold">Setting up your home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This takes about a minute the first time. Everything after that is already waiting for you.
        </p>

        <ul className="mt-6 space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5">
                {i < stage ? (
                  <Check size={16} className="text-success" />
                ) : i === stage ? (
                  <Loader2 size={16} className="animate-spin text-accent" />
                ) : (
                  <span className="block h-4 w-4 rounded-full border" />
                )}
              </span>
              <span className={i <= stage ? "" : "text-muted-foreground"}>{s.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-700"
            style={{ width: `${Math.min(95, 12 + stage * 30 + Math.min(20, seconds))}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {progress?.planStatus === "failed"
            ? "Something went wrong with the plan — opening the dashboard so you can adjust it."
            : "You can leave this page open; the rooms keep rendering in the background either way."}
        </p>
      </div>
    </div>
  );
}
