"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Sparkles, X } from "lucide-react";
import { NAV } from "./nav";
import { LogoMark } from "./Logo";
import { FeedbackCard } from "./FeedbackCard";
import { usePro } from "@/features/pro/UpgradeDialog";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/auth/actions";
import { selectProjectAction } from "@/features/projects/actions";
import type { SwitcherProject } from "./ProjectSwitcher";

// Top bar + slide-in drawer. Only rendered below the `md` breakpoint, where the
// sidebar is hidden.
export function MobileNav({ projects, currentId, canCreate }: { projects: SwitcherProject[]; currentId: string | null; canCreate: boolean }) {
  const path = usePathname();
  const { openPro } = usePro();
  const current = projects.find((p) => p.id === currentId) ?? null;

  // The drawer is open only for the route it was opened on, so navigating
  // closes it without an effect that sets state.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === path;
  const setOpen = (v: boolean) => setOpenedOn(v ? path : null);

  // Lock the body while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <LogoMark size={28} />
          <span className="truncate text-sm font-semibold">{current?.name ?? "inredia"}</span>
        </div>
        <button onClick={() => setOpen(true)} className="-mr-1 rounded-lg p-2 hover:bg-muted" aria-label="Open menu">
          <Menu size={22} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[280px] max-w-[85vw] flex-col bg-card p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Menu</span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-muted" aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active = path === href || path.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px]",
                      active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
            </nav>

            {projects.length > 1 && (
              <div className="mt-4 border-t pt-3">
                <p className="px-3 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Projects</p>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setOpen(false);
                      if (p.id !== currentId || !p.done) selectProjectAction(p.id, p.done);
                    }}
                    className={cn("flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted", p.id === currentId && "font-medium")}
                  >
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    {p.id === currentId && <span className="text-xs text-muted-foreground">current</span>}
                  </button>
                ))}
                {canCreate && (
                  <a href="/onboarding?new=1" className="block rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted">
                    + New project
                  </a>
                )}
              </div>
            )}

            <div className="mt-auto space-y-2 pt-4">
              <FeedbackCard compact />
              <button
                onClick={() => {
                  setOpen(false);
                  openPro("upgrade");
                }}
                className="block w-full rounded-xl border border-accent/30 bg-accent-soft px-3 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles size={16} className="text-accent" /> Upgrade
                </span>
              </button>
              <form action={logoutAction}>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-muted">
                  <LogOut size={16} /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
