import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";
import { GENERATIONS, signedUrls } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import { RemoveFromLibrary } from "@/features/library/RemoveFromLibrary";

export default async function LibraryPage() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const project = await getCurrentProject(sb, user.id);
  if (!project) redirect("/onboarding");

  const { data } = await sb
    .from("library_items")
    .select("id, note, created_at, generations(id, storage_path, photo_id, photos(room_id, rooms(label, type)))")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });
  type Row = {
    id: string;
    note: string | null;
    created_at: string;
    generations: { id: string; storage_path: string | null; photo_id: string; photos: { room_id: string | null; rooms: { label: string | null; type: string } | null } | null } | null;
  };
  const items = ((data ?? []) as unknown as Row[]).filter((r) => r.generations?.storage_path);
  const urls = await signedUrls(GENERATIONS, items.map((r) => r.generations!.storage_path!));

  return (
    <main className="flex-1 px-6 py-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold">Library</h1>
          <p className="text-xs text-muted-foreground">Everything you liked in {project.name}. Liked rooms also anchor the style of new generations.</p>
        </div>
        {project.plan && (
          <p className="text-sm text-muted-foreground">
            Plan total ~{formatCurrency(project.plan.total_estimate)}
            {project.preferences.budget?.total != null && ` of ${formatCurrency(project.preferences.budget.total)}`}
          </p>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <p className="font-medium">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Swipe right on the dashboard and add images here.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
            Go to dashboard →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => {
            const g = it.generations!;
            const room = g.photos?.rooms;
            const roomPlan = project.plan?.rooms.find((r) => r.room_id === g.photos?.room_id);
            return (
              <div key={it.id} className="overflow-hidden rounded-xl border bg-card card-shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[g.storage_path!]} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{room?.label ?? "Room"}</p>
                    <RemoveFromLibrary id={it.id} />
                  </div>
                  {it.note && <p className="mt-0.5 text-xs text-muted-foreground">“{it.note}”</p>}
                  {roomPlan && roomPlan.items.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        Shopping list · ~{formatCurrency(roomPlan.total)}
                      </summary>
                      <ul className="mt-1 space-y-0.5">
                        {roomPlan.items.map((x, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span>{x.item}</span>
                            <span className="shrink-0 text-muted-foreground">~{formatCurrency(x.est_price)}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <a href={urls[g.storage_path!]} download className="mt-2 inline-block text-xs text-brand hover:underline">
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
