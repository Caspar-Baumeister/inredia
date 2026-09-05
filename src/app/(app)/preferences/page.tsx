import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";
import { describePreferences } from "@/lib/ai/plan";
import { formatCurrency } from "@/lib/utils";
import { RuleList } from "@/features/preferences/RuleList";

export default async function PreferencesPage() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const project = await getCurrentProject(sb, user.id);
  if (!project) redirect("/onboarding");
  const { data: rules } = await sb
    .from("avoid_rules")
    .select("id, text, source, photo_id, created_at")
    .eq("project_id", project.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  const lines = describePreferences(project.preferences).split("\n");

  return (
    <main className="flex-1 px-6 py-6">
      <h1 className="text-lg font-semibold">Preferences</h1>
      <p className="mb-6 text-xs text-muted-foreground">Your brief for {project.name}. Change anything through the chat on the dashboard — it rebuilds the plan and regenerates the rooms.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5 card-shadow">
          <h2 className="mb-3 text-sm font-semibold">Brief</h2>
          <dl className="divide-y text-sm">
            {lines.map((l) => {
              const [k, ...rest] = l.split(":");
              return (
                <div key={l} className="flex justify-between gap-6 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{rest.join(":").trim() || "—"}</dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section className="rounded-xl border bg-card p-5 card-shadow">
          <h2 className="mb-1 text-sm font-semibold">Learned rules</h2>
          <p className="mb-3 text-xs text-muted-foreground">Things the app avoids because you swiped them away or asked in the chat.</p>
          <RuleList rules={(rules ?? []).map((r) => ({ id: r.id as string, text: r.text as string, source: r.source as string, scoped: Boolean(r.photo_id) }))} />
        </section>

        {project.plan && (
          <section className="rounded-xl border bg-card p-5 card-shadow lg:col-span-2">
            <h2 className="mb-1 text-sm font-semibold">Current furnishing plan (v{project.plan_version})</h2>
            <p className="mb-4 text-sm">{project.plan.style_guide.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {project.plan.rooms.map((r) => (
                <div key={r.room_id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between">
                    <p className="font-medium">{r.label}</p>
                    {r.budget != null && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(r.total)} / {formatCurrency(r.budget)}
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Walls: {r.walls} · Floor: {r.floor}</p>
                  <ul className="mt-2 space-y-0.5 text-xs">
                    {r.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>{it.item}</span>
                        <span className="shrink-0 text-muted-foreground">~{formatCurrency(it.est_price)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
