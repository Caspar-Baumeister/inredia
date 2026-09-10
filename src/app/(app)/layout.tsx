import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { ToastProvider } from "@/components/ui/toast";
import { ProProvider } from "@/features/pro/ProWaitlist";
import { getCurrentProject } from "@/lib/projects";
import { loadBillingProfile } from "@/lib/billing";
import { effectivePlan, projectLimitFor } from "@/lib/plans";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const project = await getCurrentProject(sb, user.id);
  const { data: projects } = await sb.from("projects").select("id, name, onboarding_done").eq("user_id", user.id).order("created_at");
  const list = (projects ?? []).map((p) => ({ id: p.id as string, name: p.name as string, done: Boolean(p.onboarding_done) }));
  const plan = effectivePlan(await loadBillingProfile(user.id));

  return (
    <ToastProvider>
      <ProProvider userEmail={user.email ?? ""} plan={plan}>
        <div className="flex min-h-screen">
          <Sidebar projects={list} currentId={project?.id ?? null} canCreate={list.length < projectLimitFor(plan)} />
          {/* overflow-x-clip: a card flung off-screen must not widen the page on mobile */}
          <div className="flex min-w-0 flex-1 flex-col overflow-x-clip">
            <MobileNav projects={list} currentId={project?.id ?? null} canCreate={list.length < projectLimitFor(plan)} />
            {children}
          </div>
        </div>
      </ProProvider>
    </ToastProvider>
  );
}
