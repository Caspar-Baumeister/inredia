import "server-only";
import { after } from "next/server";
import { getSupabaseAdmin } from "./supabase/admin";
import { buildFurnishingPlan } from "./ai/plan";
import { buildEditPrompt, buildGenerationPrompt, pickVariation, surfaceRules } from "./ai/prompt";
import { aspectRatioFor, geminiImageProvider } from "./ai/image";
import { verifyStructure } from "./ai/verify";
import { downloadAsBase64, GENERATIONS, ORIGINALS, signedUrls, uploadBuffer } from "./storage";
import type { FurnishingPlan, GenerationRow, PhotoRow, ProjectRow, RoomRow, StackCard } from "./types";

export const STACK_SIZE = Number(process.env.STACK_SIZE || 3);
// Free plan: total image allowance per user (not per day).
export const DAILY_LIMIT = Number(process.env.NEXT_PUBLIC_FREE_IMAGE_LIMIT || 50);
// Every generated image is checked against the original by the vision model;
// images that changed windows/doors/walls (or a kept floor) are regenerated.
export const STRUCTURE_CHECK = process.env.STRUCTURE_CHECK !== "0";
export const STRUCTURE_RETRIES = Number(process.env.STRUCTURE_RETRIES ?? 2);

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------
export async function ensurePlan(projectId: string, opts?: { force?: boolean }): Promise<ProjectRow> {
  const admin = getSupabaseAdmin();
  const { data: project } = await admin.from("projects").select("*").eq("id", projectId).single();
  const p = project as unknown as ProjectRow;
  if (p.plan && p.plan_status === "ready") return p;
  // "building" for more than 3 minutes means a worker died — rebuild.
  const stale = p.plan_status === "building" && Date.now() - new Date((project as { updated_at?: string }).updated_at ?? 0).getTime() > 3 * 60_000;
  if (p.plan_status === "building" && !opts?.force && !stale) return p; // someone else is on it

  await admin.from("projects").update({ plan_status: "building" }).eq("id", projectId);
  try {
    const [{ data: rooms }, { data: photos }] = await Promise.all([
      admin.from("rooms").select("*").eq("project_id", projectId).order("sort_order"),
      admin.from("photos").select("*").eq("project_id", projectId).order("sort_order"),
    ]);
    const plan = await buildFurnishingPlan(p.preferences, (rooms ?? []) as unknown as RoomRow[], (photos ?? []) as unknown as PhotoRow[]);
    const { data: updated } = await admin
      .from("projects")
      .update({ plan, plan_status: "ready" })
      .eq("id", projectId)
      .select("*")
      .single();
    return updated as unknown as ProjectRow;
  } catch (e) {
    await admin.from("projects").update({ plan_status: "failed" }).eq("id", projectId);
    throw e;
  }
}

// Called after preferences change: bumps the version (discarding all stacks) and rebuilds the plan.
export async function invalidatePlan(projectId: string, opts?: { schedulePhotoId?: string | null }) {
  const admin = getSupabaseAdmin();
  const { data: project } = await admin.from("projects").select("plan_version").eq("id", projectId).single();
  const next = ((project?.plan_version as number) ?? 0) + 1;
  await admin.from("projects").update({ plan_version: next, plan: null, plan_status: "building" }).eq("id", projectId);
  // Rebuild in the background and warm the first stack.
  after(async () => {
    try {
      await ensurePlan(projectId, { force: true });
      if (opts?.schedulePhotoId) await ensureStack(projectId, opts.schedulePhotoId);
    } catch (e) {
      console.error("invalidatePlan background failed", e);
    }
  });
}

// ---------------------------------------------------------------------------
// Stack
// ---------------------------------------------------------------------------
export type StackState = { cards: StackCard[]; limitReached: boolean; planStatus: ProjectRow["plan_status"] };

// Makes sure `photoId` has STACK_SIZE unswiped cards (ready or in flight) for
// the current plan version, enqueuing and generating the missing ones.
export async function ensureStack(projectId: string, photoId: string): Promise<StackState> {
  const admin = getSupabaseAdmin();
  const project = await ensurePlan(projectId).catch(() => null);
  if (!project || project.plan_status !== "ready") {
    return { cards: [], limitReached: false, planStatus: project?.plan_status ?? "failed" };
  }

  const existing = await loadStack(projectId, photoId, project.plan_version);
  const alive = existing.filter((c) => c.status !== "failed");
  const failed = existing.filter((c) => c.status === "failed").length;
  const missing = Math.max(0, STACK_SIZE - alive.length);
  let limitReached = false;

  // Stop re-enqueuing when this photo keeps failing (bad key, blocked content, ...).
  if (missing > 0 && failed >= STACK_SIZE * 2) {
    return { cards: alive, limitReached: false, planStatus: "failed" };
  }

  if (missing > 0) {
    const { data: remaining } = await admin.rpc("reserve_images", {
      p_user: project.user_id,
      p_count: missing,
      p_limit: DAILY_LIMIT,
    });
    if ((remaining as number) < 0) {
      limitReached = true;
    } else {
      const { count } = await admin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("photo_id", photoId)
        .eq("plan_version", project.plan_version);
      const rows = Array.from({ length: missing }, (_, i) => ({
        project_id: projectId,
        photo_id: photoId,
        plan_version: project.plan_version,
        kind: "variant",
        variation: pickVariation((count ?? 0) + i),
        status: "queued",
      }));
      const { data: inserted } = await admin.from("generations").insert(rows).select("id");
      const ids = (inserted ?? []).map((r) => r.id as string);
      after(async () => {
        await Promise.allSettled(ids.map((id) => runGeneration(id)));
      });
    }
  }

  const cards = await loadStack(projectId, photoId, project.plan_version);
  return { cards: cards.filter((c) => c.status !== "failed"), limitReached, planStatus: "ready" };
}

export async function loadStack(projectId: string, photoId: string, planVersion: number): Promise<StackCard[]> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("generations")
    .select("id, status, kind, variation, storage_path, created_at, swipes(id)")
    .eq("project_id", projectId)
    .eq("photo_id", photoId)
    .eq("plan_version", planVersion)
    .order("created_at", { ascending: true });
  type Row = { id: string; status: GenerationRow["status"]; kind: GenerationRow["kind"]; variation: Record<string, string>; storage_path: string | null; created_at: string; swipes: { id: string }[] };
  const rows = ((data ?? []) as unknown as Row[]).filter((r) => !r.swipes?.length);
  const urls = await signedUrls(GENERATIONS, rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p)));
  // Edits go on top of the stack → newest first for edits, but variants keep creation order.
  const sorted = [...rows].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "edit" ? -1 : 1;
    return a.kind === "edit" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at);
  });
  return sorted.map((r) => ({
    id: r.id,
    status: r.status,
    kind: r.kind,
    variation: r.variation ?? {},
    url: r.storage_path ? (urls[r.storage_path] ?? null) : null,
    createdAt: r.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Worker: generates one image for a queued generation row.
// ---------------------------------------------------------------------------
export async function runGeneration(generationId: string) {
  const admin = getSupabaseAdmin();
  const { data: claimed } = await admin
    .from("generations")
    .update({ status: "generating" })
    .eq("id", generationId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  if (!claimed) return; // already taken or gone
  const gen = claimed as unknown as GenerationRow;

  try {
    const [{ data: project }, { data: photo }] = await Promise.all([
      admin.from("projects").select("*").eq("id", gen.project_id).single(),
      admin.from("photos").select("*").eq("id", gen.photo_id).single(),
    ]);
    const p = project as unknown as ProjectRow;
    const ph = photo as unknown as PhotoRow;
    if (!p.plan) throw new Error("Project has no plan");
    const plan = p.plan as FurnishingPlan;

    const detected = ph.detected ?? {};
    const { keepFloor, keepWalls } = surfaceRules(p.preferences, detected);
    const original = await downloadAsBase64(ORIGINALS, ph.storage_path);

    let base = original;
    let refs: { mimeType: string; data: string }[] = [];
    let buildPrompt: (retryFeedback?: string) => string;

    if (gen.kind === "edit" && gen.parent_generation_id) {
      const { data: parent } = await admin.from("generations").select("storage_path").eq("id", gen.parent_generation_id).single();
      if (!parent?.storage_path) throw new Error("Parent image missing");
      base = await downloadAsBase64(GENERATIONS, parent.storage_path as string);
      buildPrompt = (retryFeedback) => buildEditPrompt(gen.edit_instruction ?? "", plan, { prefs: p.preferences, detected, retryFeedback });
    } else {
      const roomPlan = plan.rooms.find((r) => r.room_id === ph.room_id) ?? plan.rooms[0];
      if (!roomPlan) throw new Error("No room plan");
      const { data: rules } = await admin
        .from("avoid_rules")
        .select("text, photo_id")
        .eq("project_id", gen.project_id)
        .eq("active", true);
      const avoidRules = (rules ?? []).filter((r) => !r.photo_id || r.photo_id === gen.photo_id).map((r) => r.text as string);
      refs = await loadStyleRefs(gen.project_id, gen.photo_id);
      buildPrompt = (retryFeedback) =>
        buildGenerationPrompt({
          plan,
          roomPlan,
          prefs: p.preferences,
          detected,
          variation: gen.variation ?? {},
          avoidRules,
          hasStyleRefs: refs.length > 0,
          retryFeedback,
        });
    }

    // Generate → verify architecture → retry with the verifier's feedback.
    const aspectRatio = aspectRatioFor(ph.width, ph.height);
    let prompt = buildPrompt();
    let result: Awaited<ReturnType<typeof geminiImageProvider.generate>> | null = null;
    let lastProblems: string[] = [];
    for (let attempt = 0; attempt <= STRUCTURE_RETRIES; attempt++) {
      if (attempt > 0) prompt = buildPrompt(lastProblems.join("; "));
      const candidate = await geminiImageProvider.generate({ prompt, base, refs, aspectRatio });
      if (!STRUCTURE_CHECK) {
        result = candidate;
        break;
      }
      const verdict = await verifyStructure({
        original,
        generated: { mimeType: candidate.mimeType, data: candidate.data.toString("base64") },
        detected,
        keepFloor,
        keepWalls,
        keepExistingFurniture: p.preferences.existing_furniture === "keep",
      }).catch((e) => {
        console.error("verify failed, accepting image", e);
        return { ok: true, problems: [], confidence: 0 };
      });
      if (verdict.ok) {
        result = candidate;
        break;
      }
      lastProblems = verdict.problems.length ? verdict.problems : ["architecture changed"];
      console.warn(`structure check failed (attempt ${attempt + 1})`, gen.id, lastProblems);
      await admin.from("generations").update({ error: `retry: ${lastProblems.join("; ").slice(0, 400)}` }).eq("id", gen.id);
    }
    if (!result) throw new Error(`Structure changed after ${STRUCTURE_RETRIES + 1} attempts: ${lastProblems.join("; ")}`);

    const ext = result.mimeType.includes("jpeg") ? "jpg" : result.mimeType.includes("webp") ? "webp" : "png";
    const path = `${p.user_id}/${p.id}/${gen.id}.${ext}`;
    await uploadBuffer(GENERATIONS, path, result.data, result.mimeType);
    await admin.from("generations").update({ status: "ready", storage_path: path, prompt, error: null }).eq("id", gen.id);
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 500) ?? "unknown";
    console.error("generation failed", gen.id, msg);
    await admin.from("generations").update({ status: "failed", error: msg }).eq("id", gen.id);
    // refund the reserved image
    const { data: project } = await admin.from("projects").select("user_id").eq("id", gen.project_id).single();
    if (project) await admin.rpc("reserve_images", { p_user: project.user_id, p_count: -1, p_limit: DAILY_LIMIT });
  }
}

// Up to two liked images from OTHER photos of the same project — style anchors.
async function loadStyleRefs(projectId: string, photoId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("library_items")
    .select("generations(storage_path, photo_id)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(6);
  type Row = { generations: { storage_path: string | null; photo_id: string } | null };
  const paths = ((data ?? []) as unknown as Row[])
    .map((r) => r.generations)
    .filter((g): g is { storage_path: string; photo_id: string } => Boolean(g?.storage_path) && g?.photo_id !== photoId)
    .slice(0, 2)
    .map((g) => g.storage_path);
  return Promise.all(paths.map((p) => downloadAsBase64(GENERATIONS, p)));
}

// ---------------------------------------------------------------------------
// Edits
// ---------------------------------------------------------------------------
export async function enqueueEdit(projectId: string, photoId: string, parentId: string, instruction: string) {
  const admin = getSupabaseAdmin();
  const { data: project } = await admin.from("projects").select("user_id, plan_version").eq("id", projectId).single();
  if (!project) throw new Error("Project not found");
  const { data: remaining } = await admin.rpc("reserve_images", { p_user: project.user_id, p_count: 1, p_limit: DAILY_LIMIT });
  if ((remaining as number) < 0) return { limitReached: true as const };
  const { data: inserted } = await admin
    .from("generations")
    .insert({
      project_id: projectId,
      photo_id: photoId,
      plan_version: project.plan_version,
      kind: "edit",
      parent_generation_id: parentId,
      edit_instruction: instruction,
      status: "queued",
    })
    .select("id")
    .single();
  const id = inserted?.id as string;
  after(() => runGeneration(id));
  return { limitReached: false as const, id };
}
