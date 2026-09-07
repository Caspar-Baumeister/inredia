"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * "How it works" for buy-to-let investors: three Polaroids scattered on the
 * page, tied together by a hand-drawn arrow that draws itself as you scroll —
 * solid, then a loop, then dotted into the arrowhead.
 */

const STEPS = [
  {
    n: "01",
    title: "Find a listing",
    text: "Any portal. Save the photos of the empty flat.",
    caption: "Altbau · 3 rooms · 1.150 € cold",
    photo: "/landing/empty.jpg",
  },
  {
    n: "02",
    title: "Stage it in inredia",
    text: "Every room furnished in one style, inside a furniture budget you set.",
    caption: "same flat, furnished · 4.800 € budget",
    photo: "/landing/look-1.jpg",
  },
  {
    n: "03",
    title: "Compare the yield",
    text: "Unfurnished vs. furnished rent, furniture cost included. Then buy — or pass.",
    caption: "Mietrendite: 3,4 % → 5,6 %",
    photo: null,
  },
];

const DOTTED = "M 905 705 C 935 800, 800 850, 690 795 C 625 762, 575 738, 536 704";

export function InvestorPath() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const solid = useTransform(scrollYProgress, [0.0, 0.5], [0, 1]);
  const dotted = useTransform(scrollYProgress, [0.5, 0.95], [0, 1]);
  const noteOpacity = useTransform(scrollYProgress, [0.35, 0.5], [0, 0.7]);

  return (
    <div ref={ref} className="relative mx-auto max-w-5xl">
      {/* Desktop: scattered layout on a fixed canvas */}
      <div className="relative hidden h-[900px] md:block">
        <svg viewBox="0 0 1000 900" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" fill="none">
          <defs>
            <marker id="arrowhead" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
              <path d="M2 2 L10 6 L2 10" stroke="var(--color-honey)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </marker>
          </defs>
          {/* 1 → 2: solid with a loop */}
          <motion.path
            d="M 300 200 C 420 120, 520 130, 590 220 C 650 300, 560 360, 540 290 C 520 220, 630 200, 652 296"
            stroke="var(--color-honey)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ pathLength: solid }}
          />
          {/* 2 → 3: dotted, ending in the arrowhead. framer's pathLength would
              overwrite the dash pattern, so the dots are revealed through a mask
              whose (solid, thick) stroke is what gets drawn. */}
          <mask id="reveal-dotted" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="900">
            <motion.path d={DOTTED} stroke="#fff" strokeWidth="14" strokeLinecap="round" style={{ pathLength: dotted }} />
          </mask>
          <path d={DOTTED} stroke="var(--color-honey)" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.5 9" markerEnd="url(#arrowhead)" mask="url(#reveal-dotted)" />
          {/* small hand-written-ish note on the loop */}
          <motion.text x="470" y="405" className="font-hand" fontSize="22" fill="var(--color-ink)" style={{ opacity: noteOpacity }}>
            swipe until it fits
          </motion.text>
        </svg>

        <Polaroid step={STEPS[0]} className="absolute left-[2%] top-[2%]" rotate={-5} delay={0} />
        <Polaroid step={STEPS[1]} className="absolute right-[3%] top-[26%]" rotate={3.5} delay={0.15} />
        <Polaroid step={STEPS[2]} className="absolute left-[24%] top-[58%]" rotate={-2.5} delay={0.3} />
      </div>

      {/* Mobile: stacked, one dotted line down the left */}
      <div className="relative space-y-10 pl-8 md:hidden">
        <div className="absolute bottom-6 left-3 top-6 border-l-2 border-dotted border-honey" />
        {STEPS.map((s, i) => (
          <Polaroid key={s.n} step={s} rotate={i % 2 ? 2 : -2} delay={0} />
        ))}
      </div>
    </div>
  );
}

function Polaroid({ step, className = "", rotate, delay }: { step: (typeof STEPS)[number]; className?: string; rotate: number; delay: number }) {
  return (
    <motion.div
      className={`w-[280px] ${className}`}
      initial={{ opacity: 0, y: 40, rotate: rotate - 6, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, rotate, scale: 1 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ type: "spring", stiffness: 70, damping: 16, delay }}
      whileHover={{ rotate: 0, scale: 1.03, transition: { type: "spring", stiffness: 200, damping: 18 } }}
    >
      <div className="rounded-[3px] bg-white p-3 pb-4 shadow-[0_1px_2px_rgba(60,40,20,0.12),0_18px_40px_-12px_rgba(60,40,20,0.35)]">
        <div className="relative aspect-[4/3.6] overflow-hidden bg-[#e9e3d8]">
          {step.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={step.photo} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <YieldNote />
          )}
          <span className="font-mono absolute left-2 top-2 rounded-sm bg-white/85 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-ink/70">{step.n}</span>
        </div>
        <p className="font-hand mt-3 text-center text-[19px] leading-none text-ink/85">{step.caption}</p>
      </div>
      <div className="mt-4 pl-1">
        <h3 className="font-display text-2xl leading-tight text-ink">{step.title}</h3>
        <p className="mt-1.5 max-w-[30ch] text-[15px] leading-relaxed text-ink/65">{step.text}</p>
      </div>
    </motion.div>
  );
}

// The third "photo": a scribbled comparison instead of a picture.
function YieldNote() {
  const rows: [string, string, string][] = [
    ["", "unfurnished", "furnished"],
    ["rent p.m.", "1.150 €", "1.890 €"],
    ["furniture", "—", "4.800 €"],
    ["yield", "3,4 %", "5,6 %"],
  ];
  return (
    <div className="flex h-full w-full flex-col justify-center bg-[radial-gradient(circle_at_30%_20%,#fff8ee,#eee6d8)] px-5 font-mono text-[12px] text-ink">
      {rows.map((r, i) => (
        <div key={i} className={`grid grid-cols-[1.1fr_1fr_1fr] gap-2 py-1.5 ${i === 0 ? "text-[10px] uppercase tracking-[0.18em] text-ink/50" : "border-t border-ink/10"} ${i === 3 ? "font-semibold" : ""}`}>
          <span>{r[0]}</span>
          <span className="text-right">{r[1]}</span>
          <span className={`text-right ${i === 3 ? "text-honey" : ""}`}>{r[2]}</span>
        </div>
      ))}
      <span className="font-hand mt-3 -rotate-2 self-end text-[20px] text-honey">→ buy it</span>
    </div>
  );
}
