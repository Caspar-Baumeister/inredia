"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { CURRENT_PROJECT_COOKIE } from "@/lib/projects";
import { classifyPhoto } from "@/lib/ai/classify";
import { downloadAsBase64, ORIGINALS, signedUrl } from "@/lib/storage";
import { invalidatePlan } from "@/lib/pipeline";
import { ROOM_LABELS, type PhotoDetected, type Preferences, type RoomType } from "@/lib/types";

export async function createProjectAction(name: string): Promise<{ projectId: string }> {
  const { sb, user } = await requireUser();
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
};

export type RegisterResult = { ok: true; photo: RegisteredPhoto } | { ok: false; reason: "furnished" | "not_a_room" | "error"; message: string };

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
    return { ok: false, reason: "not_a_room", message: "This doesn't look like a room. Please upload a photo taken inside an empty room." };
  }

  // Furnished rooms are not supported yet (planned for premium): reject and clean up.
  if (detected.is_furnished) {
    await getSupabaseAdmin().storage.from(ORIGINALS).remove([input.storagePath]);
    return {
      ok: false,
      reason: "furnished",
      message: "This room already has furniture. Right now inredia works with empty rooms only — furnished rooms are coming with premium.",
    };
  }
  const type = (detected.room_type ?? "other") as RoomType;

  const { data: room, error: roomErr } = await sb
    .from("rooms")
    .insert({ project_id: input.projectId, type, label: ROOM_LABELS[type], sort_order: input.sortOrder })
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
  return { ok: true, photo: { photoId: photo.id as string, roomId: room.id as string, url, detected } };
}

export async function updateRoomAction(input: { roomId: string; type?: RoomType; label?: string; mergeIntoRoomId?: string | null; photoId?: string }) {
  const { sb } = await requireUser();
  if (input.mergeIntoRoomId && input.photoId) {
    // "same room as": move the photo to the other room and delete the now-empty room
    await sb.from("photos").update({ room_id: input.mergeIntoRoomId }).eq("id", input.photoId);
    const { count } = await sb.from("photos").select("id", { count: "exact", head: true }).eq("room_id", input.roomId);
    if (!count) await sb.from("rooms").delete().eq("id", input.roomId);
    return;
  }
  const patch: Record<string, unknown> = {};
  if (input.type) {
    patch.type = input.type;
    patch.label = input.label ?? ROOM_LABELS[input.type];
  } else if (input.label) patch.label = input.label;
  await sb.from("rooms").update(patch).eq("id", input.roomId);
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
