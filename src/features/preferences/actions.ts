"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { getCurrentProject } from "@/lib/projects";
import { QUALITY_MODES, STACK_SIZES, type Preferences, type QualityMode, type StackSize } from "@/lib/types";

// Generation settings only affect HOW images are made, not what is in them —
// so they never invalidate the plan or discard the current stacks.
export async function updateGenerationSettingsAction(input: { stackSize: number; quality: string }) {
  const { sb, user } = await requireUser();
  const project = await getCurrentProject(sb, user.id);
  if (!project) throw new Error("No project");

  const stack_size = ((STACK_SIZES as readonly number[]).includes(input.stackSize) ? input.stackSize : 5) as StackSize;
  const quality = (QUALITY_MODES.some((q) => q.id === input.quality) ? input.quality : "fast") as QualityMode;
  const preferences: Preferences = { ...project.preferences, stack_size, quality };

  const { error } = await sb.from("projects").update({ preferences }).eq("id", project.id);
  if (error) throw new Error(error.message);
  revalidatePath("/preferences");
  revalidatePath("/dashboard");
  return { stack_size, quality };
}
