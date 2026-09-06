"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/url";

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signInWithGoogleAction(formData: FormData): Promise<void> {
  return signInWithProvider("google", formData);
}

export async function signInWithAppleAction(formData: FormData): Promise<void> {
  return signInWithProvider("apple", formData);
}

async function signInWithProvider(provider: "google" | "apple", formData: FormData): Promise<void> {
  const next = safeNext(formData.get("next"));
  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${await getBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?auth_error=1");
  redirect(data.url);
}

export async function logoutAction(): Promise<void> {
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect("/login");
}
