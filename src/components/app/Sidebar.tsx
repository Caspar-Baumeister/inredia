"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Images, SlidersHorizontal, Settings, Sparkles, LogOut } from "lucide-react";
import { ProjectSwitcher, type SwitcherProject } from "./ProjectSwitcher";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/auth/actions";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/library", label: "Library", icon: Images },
  { href: "/preferences", label: "Preferences", icon: SlidersHorizontal },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ projects, currentId, canCreate }: { projects: SwitcherProject[]; currentId: string | null; canCreate: boolean }) {
  const path = usePathname();
  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r bg-card px-4 py-5">
      <ProjectSwitcher projects={projects} currentId={currentId} canCreate={canCreate} />

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
                active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <div className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles size={16} className="text-accent" /> Upgrade
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Unlimited images and more projects are coming soon.</p>
        </div>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
            <LogOut size={16} /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
