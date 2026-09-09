"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CURRENT_PROJECT_COOKIE } from "@/lib/projects";
import { canCreateProject } from "@/lib/billing";
import { classifyPhoto } from "@/lib/ai/classify";
import { downloadAsBase64, ORIGINALS, signedUrl } from "@/lib/storage";
import { invalidatePlan } from "@/lib/pipeline";
import { ROOM_LABELS, type PhotoDetected, type Preferences, type RoomType } from "@/lib/types";

export async function createProjectAction(name: string): Promise<{ projectId: string }> {
  const { sb, user } = await requireUser();
  const { count } = await sb.from("projects").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if (!(await canCreateProject(user.id, count ?? 0))) throw new Error("Your plan's project limit is reached. Upgrade to add more projects.");
  const { data, error } = await sb
    .from("projects")
    .insert({ user_id: user.id, name: name.trim() || "My home" })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create project");
  const store = await cookies();
  store.set(CURRENT_PROJECT_COOKIE, data.id as string, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  return { projectId: data.id as string };
}

export type RegisteredPhoto = {
  photoId: string;
  roomId: string;
  url: string;
  detected: PhotoDetected;
  roomType: RoomType;
  roomLabel: string; // custom name when roomType is "other"
};

export type RegisterResult = { ok: true; photo: RegisteredPhoto } | { ok: false; reason: "not_a_room" | "error"; message: string };

// Called after the browser uploaded the file to the `originals` bucket.
export async function registerPhotoAction(input: {
  projectId: string;
  storagePath: string;
  width: number;
  height: number;
  sortOrder: number;
}): Promise<RegisterResult> {
  const { sb, user } = await requireUser();
  if (!input.storagePath.startsWith(`${user.id}/${input.projectId}/`)) throw new Error("Invalid path");

  let detected: PhotoDetected = {};
  try {
    const img = await downloadAsBase64(ORIGINALS, input.storagePath);
    detected = await classifyPhoto(img);
  } catch (e) {
    console.error("classification failed", e);
    detected = { room_type: "other" };
  }

  if (detected.is_interior === false) {
    await getSupabaseAdmin().storage.from(ORIGINALS).remove([input.storagePath]);
    return { ok: false, reason: "not_a_room", message: "This doesn't look like a room. Please upload a photo taken inside a room." };
  }

  // One photo per room: if the detected type is already taken in this project,
  // fall back to "other" and let the user name it.
  const { data: existingRooms } = await sb.from("rooms").select("type").eq("project_id", input.projectId);
  const taken = new Set((existingRooms ?? []).map((r) => r.type as RoomType));
  let type = (detected.room_type ?? "other") as RoomType;
  if (type !== "other" && taken.has(type)) type = "other";
  const label = type === "other" ? "" : ROOM_LABELS[type];

  const { data: room, error: roomErr } = await sb
    .from("rooms")
    .insert({ project_id: input.projectId, type, label: label || null, sort_order: input.sortOrder })
    .select("id")
    .single();
  if (roomErr || !room) throw new Error(roomErr?.message ?? "Could not create room");

  const { data: photo, error: photoErr } = await sb
    .from("photos")
    .insert({
      project_id: input.projectId,
      room_id: room.id,
      storage_path: input.storagePath,
      width: input.width,
      height: input.height,
      detected,
      sort_order: input.sortOrder,
    })
    .select("id")
    .single();
  if (photoErr || !photo) throw new Error(photoErr?.message ?? "Could not save photo");

  const url = (await signedUrl(ORIGINALS, input.storagePath)) ?? "";
  return { ok: true, photo: { photoId: photo.id as string, roomId: room.id as string, url, detected, roomType: type, roomLabel: label } };
}

// Sets the room type, or a custom name (type "other"). Enforces one room per
// type / name within the project.
export async function updateRoomAction(input: { roomId: string; type: RoomType; label?: string }): Promise<{ ok: boolean; message?: string }> {
  const { sb } = await requireUser();
  const { data: room } = await sb.from("rooms").select("project_id").eq("id", input.roomId).single();
  if (!room) return { ok: false, message: "Room not found" };
  const { data: others } = await sb.from("rooms").select("id, type, label").eq("project_id", room.project_id as string).neq("id", input.roomId);
  const label = input.type === "other" ? (input.label ?? "").trim().slice(0, 40) : ROOM_LABELS[input.type];
  const clash = (others ?? []).some((o) =>
    input.type === "other" ? label !== "" && ((o.label as string | null) ?? "").trim().toLowerCase() === label.toLowerCase() : o.type === input.type,
  );
  if (clash) return { ok: false, message: `You already have a ${label || input.type}. One photo per room, please.` };
  await sb.from("rooms").update({ type: input.type, label: label || null }).eq("id", input.roomId);
  return { ok: true };
}

export async function deletePhotoAction(photoId: string) {
  const { sb, user } = await requireUser();
  const { data: photo } = await sb.from("photos").select("storage_path, room_id").eq("id", photoId).single();
  if (!photo) return;
  await sb.from("photos").delete().eq("id", photoId);
  const { count } = await sb.from("photos").select("id", { count: "exact", head: true }).eq("room_id", photo.room_id as string);
  if (!count) await sb.from("rooms").delete().eq("id", photo.room_id as string);
  if ((photo.storage_path as string).startsWith(`${user.id}/`)) {
    await getSupabaseAdmin().storage.from(ORIGINALS).remove([photo.storage_path as string]);
  }
}

export async function finishOnboardingAction(input: { projectId: string; preferences: Preferences }) {
  const { sb } = await requireUser();
  const { data: project } = await sb.from("projects").select("id").eq("id", input.projectId).single();
  if (!project) throw new Error("Project not found");
  await sb.from("projects").update({ preferences: input.preferences, onboarding_done: true }).eq("id", input.projectId);
  const { data: first } = await sb
    .from("photos")
    .select("id")
    .eq("project_id", input.projectId)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  await invalidatePlan(input.projectId, { schedulePhotoId: first?.id as string | undefined });
  redirect("/dashboard");
}
