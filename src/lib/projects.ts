import "server-only";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectRow } from "./types";

export const CURRENT_PROJECT_COOKIE = "inredia_project";
// Free plan: one project per user. More come with the paid plan.
export const FREE_PROJECT_LIMIT = Number(process.env.FREE_PROJECT_LIMIT || 1);

// The "current" project is remembered in a cookie; falls back to the newest one.
export async function getCurrentProject(sb: SupabaseClient, userId: string): Promise<ProjectRow | null> {
  const store = await cookies();
  const wanted = store.get(CURRENT_PROJECT_COOKIE)?.value;
  if (wanted) {
    const { data } = await sb.from("projects").select("*").eq("id", wanted).eq("user_id", userId).maybeSingle();
    if (data) return data as ProjectRow;
  }
  const { data } = await sb
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as ProjectRow | null) ?? null;
}
