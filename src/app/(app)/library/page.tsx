import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";
import { GENERATIONS, signedUrls } from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import { ROOM_LABELS, type RoomType } from "@/lib/types";
import { LibraryGallery, type LibraryGroup } from "@/features/library/LibraryGallery";

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

  // One stack per room (newest first inside each stack).
  const groupMap = new Map<string, LibraryGroup>();
  for (const it of items) {
    const g = it.generations!;
    const roomId = g.photos?.room_id ?? `photo:${g.photo_id}`;
    const room = g.photos?.rooms;
    const label = room?.label ?? (room ? ROOM_LABELS[room.type as RoomType] : "Room");
    if (!groupMap.has(roomId)) {
      groupMap.set(roomId, { roomId, label, images: [], plan: project.plan?.rooms.find((r) => r.room_id === g.photos?.room_id) ?? null });
    }
    groupMap.get(roomId)!.images.push({ id: it.id, url: urls[g.storage_path!] ?? "", note: it.note, createdAt: it.created_at });
  }
  const groups = [...groupMap.values()].filter((g) => g.images.length > 0);

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
        <LibraryGallery groups={groups} />
      )}
    </main>
  );
}
