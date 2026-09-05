import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";
import { ORIGINALS, signedUrls } from "@/lib/storage";
import { SelectProjectButton } from "@/features/projects/SelectProjectButton";
import type { ProjectRow } from "@/lib/types";

export default async function ProjectsPage() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const current = await getCurrentProject(sb, user.id);
  const { data: projects } = await sb.from("projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  const rows = (projects ?? []) as unknown as ProjectRow[];
  const { data: covers } = await sb
    .from("photos")
    .select("project_id, storage_path, sort_order")
    .in("project_id", rows.map((p) => p.id))
    .order("sort_order");
  const coverByProject: Record<string, string> = {};
  for (const c of covers ?? []) if (!coverByProject[c.project_id as string]) coverByProject[c.project_id as string] = c.storage_path as string;
  const urls = await signedUrls(ORIGINALS, Object.values(coverByProject));

  return (
    <main className="flex-1 px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Projects</h1>
          <p className="text-xs text-muted-foreground">Each project is one home with its own photos, preferences and library.</p>
        </div>
        <Link href="/onboarding?new=1" className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-white">
          <Plus size={16} /> New project
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-xl border bg-card card-shadow">
            <div className="aspect-[4/3] bg-muted">
              {coverByProject[p.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[coverByProject[p.id]]} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.onboarding_done ? `Plan v${p.plan_version}` : "Setup not finished"}</p>
              </div>
              <SelectProjectButton id={p.id} active={current?.id === p.id} done={p.onboarding_done} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
