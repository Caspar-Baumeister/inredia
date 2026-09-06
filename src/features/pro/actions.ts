"use server";

import { requireUser } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";

export type WaitlistSource = "upgrade" | "image_limit" | "new_project" | "other";

// Puts the user on the Pro waitlist and (optionally) emails the founder.
export async function joinProWaitlistAction(input: { email: string; source: WaitlistSource; note?: string }): Promise<{ ok: true }> {
  const { sb, user } = await requireUser();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Please enter a valid email.");
  const note = (input.note ?? "").trim().slice(0, 500);
  const { error } = await sb.from("waitlist").insert({ user_id: user.id, email, source: input.source, reason: note || null });
  if (error) throw new Error(error.message);
  await notifyFounder({ email, source: input.source, note, userId: user.id }).catch((e) => console.error("waitlist notify failed", e));
  return { ok: true };
}

// Sends a short email via Resend when RESEND_API_KEY is configured; otherwise a no-op
// (the row is in the `waitlist` table either way).
async function notifyFounder(p: { email: string; source: string; note: string; userId: string }) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.WAITLIST_NOTIFY_EMAIL || SITE.contactEmail;
  if (!key) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.WAITLIST_FROM_EMAIL || "inredia <onboarding@resend.dev>",
      to: [to],
      subject: `inredia Pro waitlist: ${p.email} (${p.source})`,
      text: `New Pro waitlist signup\n\nEmail: ${p.email}\nSource: ${p.source}\nUser: ${p.userId}\nNote: ${p.note || "—"}`,
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
