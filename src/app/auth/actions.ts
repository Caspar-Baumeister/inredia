"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/url";

export type AuthState = { error?: string; sent?: boolean } | undefined;

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function magicLinkAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Please enter a valid email." };
  const next = safeNext(formData.get("next"));
  const sb = await createServerSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${getBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };
  return { sent: true };
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
    options: { redirectTo: `${getBaseUrl()}/api/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?auth_error=1");
  redirect(data.url);
}

export async function logoutAction(): Promise<void> {
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect("/login");
}
