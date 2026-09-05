"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { CURRENT_PROJECT_COOKIE } from "@/lib/projects";

export async function selectProjectAction(projectId: string, done: boolean) {
  const { sb, user } = await requireUser();
  const { data } = await sb.from("projects").select("id").eq("id", projectId).eq("user_id", user.id).maybeSingle();
  if (!data) throw new Error("Project not found");
  const store = await cookies();
  store.set(CURRENT_PROJECT_COOKIE, projectId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  redirect(done ? "/dashboard" : "/onboarding");
}
