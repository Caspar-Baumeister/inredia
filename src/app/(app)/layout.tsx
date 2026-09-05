import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Sidebar } from "@/components/app/Sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { getCurrentProject } from "@/lib/projects";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const project = await getCurrentProject(sb, user.id);

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar projectName={project?.name ?? null} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ToastProvider>
  );
}
