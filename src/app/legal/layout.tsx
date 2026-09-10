import Link from "next/link";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { LogoMark } from "@/components/app/Logo";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["opsz", "SOFT"], style: ["normal", "italic"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400"] });

const PAGES = [
  { href: "/legal/imprint", label: "Impressum" },
  { href: "/legal/privacy", label: "Datenschutz" },
  { href: "/legal/terms", label: "AGB" },
];

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`landing ${display.variable} ${mono.variable} min-h-screen bg-paper text-ink`}>
      <header className="flex items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={30} />
          <span className="font-display text-[19px] tracking-tight">inredia</span>
        </Link>
        <nav className="flex gap-4 text-sm text-ink/60">
          {PAGES.map((p) => (
            <Link key={p.href} href={p.href} className="hover:text-ink">
              {p.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-8 md:pt-12">{children}</main>
    </div>
  );
}
