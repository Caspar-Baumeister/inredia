import Link from "next/link";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { createServerSupabase } from "@/lib/supabase/server";
import { LogoMark } from "@/components/app/Logo";
import { loadBillingProfile } from "@/lib/billing";
import { effectivePlan } from "@/lib/plans";
import { PricingPublic } from "@/features/pro/PricingPublic";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz", "SOFT"], style: ["normal", "italic"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400"] });

export default async function PricingPage() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const plan = user ? effectivePlan(await loadBillingProfile(user.id)) : "free";
  return (
    <div className={`landing ${display.variable} ${mono.variable} min-h-screen bg-paper text-ink`}>
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-[19px] tracking-tight">inredia</span>
        </Link>
        <Link href={user ? "/dashboard" : "/login"} className="rounded-full border border-ink/15 px-4 py-1.5 text-sm hover:border-ink/40">
          {user ? "Open app" : "Sign in"}
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10 md:pt-16">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink/55">Pricing</span>
        <h1 className="font-display mt-4 text-4xl leading-[1.02] tracking-tight md:text-6xl">
          Start free. <em className="italic text-honey">Pay when it pays.</em>
        </h1>
        <p className="mt-4 max-w-lg text-ink/70">Every plan is about one thing: how many images you can generate per day. Free gives you 50 to try it on a real listing.</p>
        <div className="mt-12">
          <PricingPublic currentPlan={plan} signedIn={Boolean(user)} />
        </div>
        <div className="mt-16 flex flex-wrap justify-center gap-4 border-t border-ink/15 pt-6 text-xs text-ink/55">
          <Link href="/legal/imprint" className="hover:text-ink">
            Impressum
          </Link>
          <Link href="/legal/privacy" className="hover:text-ink">
            Datenschutz
          </Link>
          <Link href="/legal/terms" className="hover:text-ink">
            AGB
          </Link>
        </div>
      </main>
    </div>
  );
}
