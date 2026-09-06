"use server";

import { requireUser } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";
import { ensureStack, enqueueEdit, invalidatePlan, type StackState } from "@/lib/pipeline";
import { preferencesDiffFromChat } from "@/lib/ai/chat";
import { ROOM_LABELS, type PreferencesDiff, type RoomRow } from "@/lib/types";

async function ctx() {
  const { sb, user } = await requireUser();
  const project = await getCurrentProject(sb, user.id);
  if (!project) throw new Error("No project");
  return { sb, user, project };
}

export async function getStackAction(photoId: string): Promise<StackState> {
  const { sb, project } = await ctx();
  const { data: photo } = await sb.from("photos").select("id").eq("id", photoId).eq("project_id", project.id).maybeSingle();
  if (!photo) throw new Error("Photo not found");
  return ensureStack(project.id, photoId);
}

export type SwipeResult = Record<string, never>;

export async function swipeAction(input: {
  generationId: string;
  action: "like" | "dislike";
  addToLibrary?: boolean;
  note?: string;
}): Promise<SwipeResult> {
  const { sb, user, project } = await ctx();
  const { data: gen } = await sb
    .from("generations")
    .select("id")
    .eq("id", input.generationId)
    .eq("project_id", project.id)
    .single();
  if (!gen) throw new Error("Generation not found");

  await sb.from("swipes").upsert({ generation_id: gen.id, user_id: user.id, action: input.action }, { onConflict: "generation_id" });

  if (input.action === "like" && input.addToLibrary) {
    await sb.from("library_items").upsert({ project_id: project.id, generation_id: gen.id, note: input.note ?? null }, { onConflict: "generation_id" });
  }

  return {};
}

export async function editAction(input: { photoId: string; generationId: string; instruction: string }) {
  const { project } = await ctx();
  const instruction = input.instruction.trim().slice(0, 500);
  if (!instruction) throw new Error("Empty instruction");
  return enqueueEdit(project.id, input.photoId, input.generationId, instruction);
}

export type ChatPreview = { diff: PreferencesDiff; discardCount: number; message: string };

export async function chatPreviewAction(message: string): Promise<ChatPreview> {
  const { sb, project } = await ctx();
  const [{ data: rules }, { data: rooms }, { count }] = await Promise.all([
    sb.from("avoid_rules").select("id, text").eq("project_id", project.id).eq("active", true),
    sb.from("rooms").select("*").eq("project_id", project.id).order("sort_order"),
    sb
      .from("generations")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("plan_version", project.plan_version)
      .in("status", ["ready", "queued", "generating"]),
  ]);
  const diff = await preferencesDiffFromChat({
    message: message.trim().slice(0, 1000),
    prefs: project.preferences,
    avoidRules: (rules ?? []).map((r) => ({ id: r.id as string, text: r.text as string })),
    roomList: ((rooms ?? []) as unknown as RoomRow[]).map((r) => ({ id: r.id, label: r.label ?? ROOM_LABELS[r.type] })),
  });
  return { diff, discardCount: count ?? 0, message };
}

export async function applyChatAction(preview: ChatPreview, currentPhotoId: string | null) {
  const { sb, project } = await ctx();
  const { diff } = preview;
  await sb.from("chat_messages").insert([
    { project_id: project.id, role: "user", content: preview.message },
    { project_id: project.id, role: "assistant", content: diff.summary.join("\n") || "No changes.", diff, applied: true },
  ]);
  await sb.from("projects").update({ preferences: diff.preferences }).eq("id", project.id);
  if (diff.avoid_rules_remove?.length) {
    await sb.from("avoid_rules").update({ active: false }).in("id", diff.avoid_rules_remove).eq("project_id", project.id);
  }
  if (diff.avoid_rules_add?.length) {
    await sb.from("avoid_rules").insert(diff.avoid_rules_add.map((text) => ({ project_id: project.id, text, source: "chat" })));
  }
  if (diff.requires_regeneration) await invalidatePlan(project.id, { schedulePhotoId: currentPhotoId });
  return { regenerated: diff.requires_regeneration };
}

export async function removeRuleAction(ruleId: string) {
  const { sb, project } = await ctx();
  await sb.from("avoid_rules").update({ active: false }).eq("id", ruleId).eq("project_id", project.id);
}

export async function joinWaitlistAction() {
  const { sb, user, project } = await ctx();
  await sb.from("waitlist").insert({ user_id: user.id, email: user.email ?? "", reason: `daily limit · project ${project.id}` });
}

export async function switchPhotoPreloadAction(photoId: string) {
  // Warm the next photo's stack without blocking the UI.
  return getStackAction(photoId);
}
