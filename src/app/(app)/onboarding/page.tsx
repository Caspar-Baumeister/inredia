import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Wizard, type ExistingProject } from "@/features/onboarding/Wizard";
import { FREE_PROJECT_LIMIT, getCurrentProject } from "@/lib/projects";
import { ORIGINALS, signedUrls } from "@/lib/storage";
import type { PhotoRow, RoomRow } from "@/lib/types";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;

  // Resume an unfinished project (unless ?new=1 explicitly starts another one —
  // which the free plan only allows while there is no project yet).
  let existing: ExistingProject | null = null;
  const { count } = await sb.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  const wantsNew = Boolean(params.new) && (count ?? 0) < FREE_PROJECT_LIMIT;
  if (!wantsNew) {
    const project = await getCurrentProject(sb, user.id);
    if (project?.onboarding_done && params.new) redirect("/dashboard");
    if (project && !project.onboarding_done) {
      const [{ data: photos }, { data: rooms }] = await Promise.all([
        sb.from("photos").select("*").eq("project_id", project.id).order("sort_order"),
        sb.from("rooms").select("*").eq("project_id", project.id),
      ]);
      const ph = (photos ?? []) as unknown as PhotoRow[];
      const rm = (rooms ?? []) as unknown as RoomRow[];
      const urls = await signedUrls(ORIGINALS, ph.map((p) => p.storage_path));
      existing = {
        id: project.id,
        name: project.name,
        photos: ph.map((p) => ({
          photoId: p.id,
          roomId: p.room_id ?? "",
          url: urls[p.storage_path] ?? "",
          detected: p.detected ?? {},
          roomType: rm.find((r) => r.id === p.room_id)?.type ?? "other",
          roomLabel: rm.find((r) => r.id === p.room_id)?.label ?? "",
          localUrl: "",
        })),
      };
    }
  }

  return (
    <main className="flex-1">
      <Wizard userId={user.id} existing={existing} />
    </main>
  );
}
