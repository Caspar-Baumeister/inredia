"use client";

import { useEffect } from "react";
import { warmProjectAction } from "@/features/dashboard/actions";

// Keeps the pipeline moving while the user browses the library: restarts anything
// that was abandoned mid-flight and starts rooms that have nothing yet, so the
// dashboard is ready when they go back to it. Renders nothing.
export function Prewarm({ intervalMs = 30000 }: { intervalMs?: number }) {
  useEffect(() => {
    let stop = false;
    const run = () => {
      if (!stop) warmProjectAction().catch(() => {});
    };
    run();
    const t = window.setInterval(run, intervalMs);
    return () => {
      stop = true;
      window.clearInterval(t);
    };
  }, [intervalMs]);
  return null;
}
