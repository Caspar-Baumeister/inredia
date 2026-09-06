import Link from "next/link";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { createServerSupabase } from "@/lib/supabase/server";
import { LogoMark } from "@/components/app/Logo";
import { SITE } from "@/lib/site";
import { ScrollStory } from "@/features/landing/ScrollStory";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz", "SOFT"], style: ["normal", "italic"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400"] });

const STEPS = [
  { n: "01", title: "One photo per room", text: "Empty or already furnished — a phone picture is enough." },
  { n: "02", title: "Six small questions", text: "Floor, style, where you shop, budget. Two minutes, no account forms." },
  { n: "03", title: "Swipe until it's home", text: "Three looks per room, all from one plan. Keep what you love, skip the rest." },
];

export default async function Home() {
  const sb = await createServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const ctaHref = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "Open your rooms" : "Try it free";

  return (
    <div className={`landing ${display.variable} ${mono.variable} bg-paper text-ink`}>
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

      {/* How it works — one editorial section, no cards, no icons */}
      <section className="mx-auto max-w-5xl px-6 pb-28 pt-24 md:pb-36 md:pt-32">
        <p className="font-display max-w-3xl text-[2rem] leading-[1.08] tracking-tight md:text-[3.25rem]">
          It works like a good interior designer, <em className="italic text-honey">minus the six weeks.</em>
        </p>

        <ol className="mt-16 grid gap-x-10 border-t border-ink/15 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="border-b border-ink/15 py-7 md:border-b-0 md:border-r md:py-9 md:pr-8 md:last:border-r-0">
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-honey">{s.n}</span>
              <h3 className="font-display mt-3 text-2xl leading-tight">{s.title}</h3>
              <p className="mt-2 max-w-[30ch] text-[15px] leading-relaxed text-ink/65">{s.text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-16 flex flex-col items-start gap-4 border-t border-ink/15 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">
            Free in beta · {SITE.freeImageLimit} images included · Google sign-in
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
