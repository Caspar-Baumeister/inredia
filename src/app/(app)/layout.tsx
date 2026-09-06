import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/Sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { ProProvider } from "@/features/pro/ProWaitlist";
import { FREE_PROJECT_LIMIT, getCurrentProject } from "@/lib/projects";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const project = await getCurrentProject(sb, user.id);
  const { data: projects } = await sb.from("projects").select("id, name, onboarding_done").eq("user_id", user.id).order("created_at");
  const list = (projects ?? []).map((p) => ({ id: p.id as string, name: p.name as string, done: Boolean(p.onboarding_done) }));

  return (
    <ToastProvider>
      <ProProvider userEmail={user.email ?? ""}>
        <div className="flex min-h-screen">
          <Sidebar projects={list} currentId={project?.id ?? null} canCreate={list.length < FREE_PROJECT_LIMIT} />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </ProProvider>
    </ToastProvider>
  );
}
