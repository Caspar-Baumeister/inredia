"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";

export async function removeFromLibraryAction(id: string) {
  const { sb } = await requireUser();
  await sb.from("library_items").delete().eq("id", id);
  revalidatePath("/library");
}
