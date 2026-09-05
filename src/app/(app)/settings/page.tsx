import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { logoutAction } from "@/app/auth/actions";

export default async function SettingsPage() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("profiles").select("daily_image_count, daily_count_reset_at").eq("id", user.id).maybeSingle();
  const limit = Number(process.env.DAILY_IMAGE_LIMIT || 60);
  const resetToday = profile?.daily_count_reset_at && new Date(profile.daily_count_reset_at as string) >= new Date(new Date().setHours(0, 0, 0, 0));
  const used = resetToday ? (profile?.daily_image_count as number) : 0;

  return (
    <main className="flex-1 px-6 py-6">
      <h1 className="mb-6 text-lg font-semibold">Settings</h1>
      <div className="max-w-lg space-y-4">
        <section className="rounded-xl border bg-card p-5 card-shadow">
          <h2 className="text-sm font-semibold">Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          <form action={logoutAction} className="mt-3">
            <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Sign out</button>
          </form>
        </section>
        <section className="rounded-xl border bg-card p-5 card-shadow">
          <h2 className="text-sm font-semibold">Usage today</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {used} of {limit} images generated. The counter resets at midnight.
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (used / limit) * 100)}%` }} />
          </div>
        </section>
      </div>
    </main>
  );
}
