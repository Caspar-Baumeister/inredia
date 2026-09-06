"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronsUpDown, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { selectProjectAction } from "@/features/projects/actions";

export type SwitcherProject = { id: string; name: string; done: boolean };

export function ProjectSwitcher({ projects, currentId, canCreate }: { projects: SwitcherProject[]; currentId: string | null; canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const current = projects.find((p) => p.id === currentId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-muted/70"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success/90 text-sm font-semibold text-white">
          {(current?.name ?? "i").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{current?.name ?? "inredia"}</p>
          <p className="text-[11px] text-muted-foreground">inredia</p>
        </div>
        <ChevronsUpDown size={14} className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border bg-card card-shadow fade-up" role="listbox">
          <p className="px-3 pb-1 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Projects</p>
          {projects.map((p) => (
            <button
              key={p.id}
              role="option"
              aria-selected={p.id === currentId}
              disabled={pending}
              onClick={() => {
                setOpen(false);
                if (p.id !== currentId || !p.done) start(() => selectProjectAction(p.id, p.done));
              }}
              className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted", p.id === currentId && "font-medium")}
            >
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {!p.done && <span className="rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">setup</span>}
              {p.id === currentId && <Check size={14} />}
            </button>
          ))}
          <div className="border-t">
            {canCreate ? (
              <a href="/onboarding?new=1" className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
                <Plus size={14} /> New project
              </a>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground" title="The free plan includes one project.">
                <Lock size={14} /> New project
                <span className="ml-auto rounded-full border border-accent/40 bg-accent-soft px-1.5 text-[10px] font-medium text-accent">Pro</span>
              </div>
            )}
            {!canCreate && <p className="px-3 pb-2 text-[11px] text-muted-foreground">More projects come with the paid plan.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
