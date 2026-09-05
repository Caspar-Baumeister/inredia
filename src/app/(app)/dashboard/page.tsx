import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";
import { ORIGINALS, signedUrls } from "@/lib/storage";
import { ROOM_LABELS, type PhotoRow, type RoomRow } from "@/lib/types";
import { Dashboard, type DashboardPhoto } from "@/features/dashboard/Dashboard";

export const maxDuration = 120;

export default async function DashboardPage() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const project = await getCurrentProject(sb, user.id);
  if (!project || !project.onboarding_done) redirect("/onboarding");

  const [{ data: photos }, { data: rooms }] = await Promise.all([
    sb.from("photos").select("*").eq("project_id", project.id).order("sort_order"),
    sb.from("rooms").select("*").eq("project_id", project.id),
  ]);
  const ph = (photos ?? []) as unknown as PhotoRow[];
  const rm = (rooms ?? []) as unknown as RoomRow[];
  if (!ph.length) redirect("/onboarding");
  const urls = await signedUrls(ORIGINALS, ph.map((p) => p.storage_path));

  const dashboardPhotos: DashboardPhoto[] = ph.map((p) => {
    const room = rm.find((r) => r.id === p.room_id);
    return {
      id: p.id,
      roomId: p.room_id,
      roomLabel: room?.label ?? (room ? ROOM_LABELS[room.type] : "Room"),
      url: urls[p.storage_path] ?? "",
      width: p.width,
      height: p.height,
    };
  });

  return <Dashboard project={{ id: project.id, name: project.name, plan: project.plan, planStatus: project.plan_status, preferences: project.preferences }} photos={dashboardPhotos} />;
}
