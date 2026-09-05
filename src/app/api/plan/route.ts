import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";

export async function GET() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const project = await getCurrentProject(sb, user.id);
  return NextResponse.json({ plan: project?.plan ?? null, status: project?.plan_status ?? "none" });
}
