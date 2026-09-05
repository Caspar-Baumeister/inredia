"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fade-up">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export type Option = { id: string; label: string; blurb?: string; swatches?: string[] };

export function OptionCards({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Option[];
  value?: string | null;
  onChange: (id: string) => void;
  columns?: 1 | 2 | 3 | 4;
}) {
  return (
    <div className={cn("grid gap-3", columns === 1 && "grid-cols-1", columns === 2 && "grid-cols-1 sm:grid-cols-2", columns === 3 && "grid-cols-2 sm:grid-cols-3", columns === 4 && "grid-cols-2 sm:grid-cols-4")}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "relative rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/30",
              active && "border-foreground ring-2 ring-foreground/10",
            )}
          >
            {o.swatches && (
              <div className="mb-3 flex gap-1.5">
                {o.swatches.map((s) => (
                  <span key={s} className="h-6 w-6 rounded-full border" style={{ background: s }} />
                ))}
              </div>
            )}
            <div className="font-medium">{o.label}</div>
            {o.blurb && <div className="mt-0.5 text-sm text-muted-foreground">{o.blurb}</div>}
            {active && (
              <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-foreground text-white">
                <Check size={12} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Chips({
  options,
  values,
  onToggle,
}: {
  options: { id: string; label: string }[];
  values: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onToggle(o.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              active ? "border-foreground bg-foreground text-white" : "bg-card hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
