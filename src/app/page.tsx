import Link from "next/link";
import { Caveat, Fraunces, IBM_Plex_Mono } from "next/font/google";
import { createServerSupabase } from "@/lib/supabase/server";
import { LogoMark } from "@/components/app/Logo";
import { SITE } from "@/lib/site";
import { ScrollStory } from "@/features/landing/ScrollStory";
import { InvestorPath } from "@/features/landing/InvestorPath";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz", "SOFT"], style: ["normal", "italic"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400"] });
const hand = Caveat({ subsets: ["latin"], variable: "--font-hand", weight: ["500"] });

export default async function Home() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const ctaHref = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "Open your rooms" : "Start free";

  return (
    <div className={`landing ${display.variable} ${mono.variable} ${hand.variable} bg-paper text-ink`}>
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-[19px] tracking-tight">inredia</span>
        </Link>
        <Link href={ctaHref} className="rounded-full border border-ink/15 bg-paper/70 px-4 py-1.5 text-sm backdrop-blur transition-colors hover:border-ink/40">
          {user ? "Open app" : "Sign in"}
        </Link>
      </header>

      <ScrollStory ctaHref={ctaHref} ctaLabel={ctaLabel} />

      {/* How it works — for buy-to-let investors */}
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-24 md:pb-32 md:pt-32">
        <div className="mb-14 flex flex-col gap-4 md:mb-6 md:flex-row md:items-end md:justify-between">
          <p className="font-display max-w-2xl text-[2rem] leading-[1.08] tracking-tight md:text-[3.25rem]">
            Built for people who buy <em className="italic text-honey">to let.</em>
          </p>
          <p className="font-mono max-w-[36ch] text-[11px] uppercase leading-relaxed tracking-[0.18em] text-ink/50">
            Furnished rents are higher. Now you can see what a listing looks like furnished — before you make an offer.
          </p>
        </div>

        <InvestorPath />

        <div className="mt-20 flex flex-col items-start gap-4 border-t border-ink/15 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
            Free from the first listing · {SITE.freeImageLimit} images included · no card
          </p>
          <Link href={ctaHref} className="inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-paper transition-transform hover:-translate-y-0.5">
            {ctaLabel} <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink/15">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-ink/60 md:flex-row md:items-center md:justify-between">
          <span className="font-display text-lg text-ink">inredia</span>
          <p>
            Made by {SITE.founder}, one person. Bugs, wishes, hellos →{" "}
            <a href={SITE.xUrl} target="_blank" rel="noreferrer" className="text-ink underline decoration-honey decoration-2 underline-offset-4">
              {SITE.xHandle} on X
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
