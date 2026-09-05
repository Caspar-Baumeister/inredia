"use client";

import { useTransition } from "react";
import { selectProjectAction } from "./actions";

export function SelectProjectButton({ id, active, done }: { id: string; active: boolean; done: boolean }) {
  const [pending, start] = useTransition();
  if (active && done) return <span className="rounded-full bg-success-soft px-3 py-1 text-xs text-success">Current</span>;
  return (
    <button
      onClick={() => start(() => selectProjectAction(id, done))}
      disabled={pending}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
    >
      {done ? "Open" : "Set up"}
    </button>
  );
}
