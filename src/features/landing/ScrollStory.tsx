"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-driven hero.
 *
 * Timeline (0..1 = scroll progress through the sticky section):
 *   0.00–0.55  video scrub: empty room → furniture drops in → camera pulls back
 *              (frames from /landing/frames/NNN.webp, count from /landing/frames.json;
 *               without frames it crossfades /landing/empty.jpg → /landing/look-1.jpg)
 *   0.55–0.68  the full-bleed frame shrinks into a card
 *   0.68–0.84  card 1 (look-1) is swiped away, card 2 (look-2) rises from underneath
 *   0.84–1.00  card 2 is swiped away, card 3 (look-3) settles; headline fades in
 */
const T = { scrubEnd: 0.55, cardEnd: 0.68, swipe1End: 0.84 };
const SCROLL_HEIGHT_VH = 420;

type Manifest = { count: number; ext?: string; pad?: number };

export function ScrollStory({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [manifest, setManifest] = useState<Manifest | null | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [loadedFrames, setLoadedFrames] = useState(0);

  // Frames manifest (optional).
  useEffect(() => {
    fetch("/landing/frames.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((m: Manifest | null) => setManifest(m && m.count > 1 ? m : null))
      .catch(() => setManifest(null));
  }, []);

  // Preload frames progressively (first, last, then the rest).
  useEffect(() => {
    if (!manifest) return;
    const { count, ext = "webp", pad = 3 } = manifest;
    const imgs: HTMLImageElement[] = new Array(count);
    let loaded = 0;
    const order = [0, count - 1, ...Array.from({ length: count }, (_, i) => i).filter((i) => i !== 0 && i !== count - 1)];
    for (const i of order) {
      const img = new Image();
      img.src = `/landing/frames/${String(i + 1).padStart(pad, "0")}.${ext}`;
      img.onload = () => {
        loaded++;
        setLoadedFrames(loaded);
      };
      imgs[i] = img;
    }
    framesRef.current = imgs;
  }, [manifest]);

  // Scroll → progress.
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Draw the current frame (cover-fit).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !manifest) return;
    const frames = framesRef.current;
    const idx = Math.min(manifest.count - 1, Math.round(clamp01(progress / T.scrubEnd) * (manifest.count - 1)));
    // nearest loaded frame at or before idx
    let img: HTMLImageElement | undefined;
    for (let i = idx; i >= 0; i--) {
      if (frames[i]?.complete && frames[i].naturalWidth) {
        img = frames[i];
        break;
      }
    }
    if (!img) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s,
      dh = img.naturalHeight * s;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }, [progress, manifest, loadedFrames]);

  // Derived animation values -------------------------------------------------
  const scrub = clamp01(progress / T.scrubEnd);
  const toCard = clamp01((progress - T.scrubEnd) / (T.cardEnd - T.scrubEnd));
  const swipe1 = clamp01((progress - T.cardEnd) / (T.swipe1End - T.cardEnd));
  const swipe2 = clamp01((progress - T.swipe1End) / (1 - T.swipe1End));

  const e = easeInOut(toCard);
  // Full-bleed stage → card: round corners and add a shadow as it shrinks.
  const cardFrame: React.CSSProperties = {
    borderRadius: `${28 * e}px`,
    boxShadow: e > 0 ? `0 ${28 * e}px ${70 * e}px rgba(70,45,20,${0.28 * e}), 0 ${2 * e}px ${6 * e}px rgba(70,45,20,${0.12 * e})` : "none",
  };
  const heroTextOpacity = 1 - clamp01(scrub / 0.25);
  const finalTextOpacity = clamp01((swipe2 - 0.5) / 0.5);

  const swipeStyle = (t: number): React.CSSProperties => {
    const s = easeIn(t);
    return { transform: `translateX(${-140 * s}%) translateY(${-10 * s}%) rotate(${-18 * s}deg)`, transformOrigin: "50% 120%", opacity: 1 - clamp01((s - 0.75) / 0.25) };
  };
  const riseStyle = (t: number): React.CSSProperties => {
    const s = easeOut(t);
    return { transform: `scale(${0.92 + 0.08 * s}) translateY(${16 - 16 * s}px)`, opacity: 0.6 + 0.4 * s };
  };

  // Editorial captions for the three looks (index switches with the swipes).
  const lookIndex = swipe2 > 0.5 ? 2 : swipe1 > 0.5 ? 1 : 0;
  const captionsVisible = toCard === 1;

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${SCROLL_HEIGHT_VH}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden bg-paper">
        {/* Stage: full-bleed video / stills, shrinking into a card. The deck of
            cards sits in the same (unclipped) frame so a swiped card really leaves it. */}
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative h-full w-full will-change-transform" style={{ transform: `scale(${1 - 0.55 * e})` }}>
            <div className="absolute inset-0 overflow-hidden" style={cardFrame}>
              {manifest ? (
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              ) : (
                <>
                  <Still src="/landing/empty.jpg" label="empty room" />
                  <Still src="/landing/look-1.jpg" label="furnished" style={{ opacity: easeInOut(clamp01((scrub - 0.3) / 0.6)) }} />
                </>
              )}
            </div>
            {/* Deck: look 3 at the bottom, look 2, look 1 on top (identical to the last video frame). */}
            <Still src="/landing/look-3.jpg" label="look 3" frame={cardFrame} style={withVisibility(riseStyle(swipe2), toCard > 0.9)} />
            <Still src="/landing/look-2.jpg" label="look 2" frame={cardFrame} style={withVisibility(swipe2 > 0 ? swipeStyle(swipe2) : riseStyle(swipe1), toCard > 0.9)} />
            <Still src="/landing/look-1.jpg" label="look 1" frame={cardFrame} style={withVisibility(swipeStyle(swipe1), toCard > 0)} />

          </div>
        </div>

        {/* Caption rails beside the card (card is 45vw × 45vh, centred) */}
        <div
          className="pointer-events-none absolute hidden flex-col items-end text-right transition-opacity duration-500 md:flex"
          style={{ right: "calc(72.5vw + 28px)", top: "27.5vh", width: "min(22vw, 300px)", opacity: captionsVisible ? 1 : 0 }}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">Look {String(lookIndex + 1).padStart(2, "0")} / 03</span>
          <span className="font-display mt-2 text-3xl leading-tight text-ink">{LOOKS[lookIndex].title}</span>
          <span className="mt-2 max-w-[24ch] text-sm text-ink/60">{LOOKS[lookIndex].blurb}</span>
          <span className="mt-4 h-px w-16 bg-honey" />
        </div>
        <div
          className="pointer-events-none absolute hidden flex-col items-start text-left transition-opacity duration-500 md:flex"
          style={{ left: "calc(72.5vw + 28px)", bottom: "27.5vh", width: "min(22vw, 300px)", opacity: captionsVisible && swipe2 < 0.5 ? 1 : 0 }}
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50">Same room · same budget</span>
          <span className="mt-2 text-sm text-ink/60">Keep scrolling to swipe.</span>
        </div>

        {/* Hero copy on the bright room: ink on a soft paper veil */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[62vh] bg-gradient-to-b from-paper/95 via-paper/60 to-transparent" style={{ opacity: heroTextOpacity }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center px-6 pt-28 text-center text-ink md:pt-32" style={{ opacity: heroTextOpacity, transform: `translateY(${-24 * (1 - heroTextOpacity)}px)` }}>
          <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink/55">For buy-to-let investors</span>
          <h1 className="font-display mt-5 max-w-4xl text-[2.6rem] leading-[0.98] tracking-tight md:text-[5.25rem]">
            See it furnished
            <br />
            <em className="font-light italic text-honey">before you buy.</em>
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink/70 md:text-base">Stage any listing with AI. Compare the furnished yield. Decide.</p>
          <a href={ctaHref} className="pointer-events-auto mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-paper transition-transform hover:-translate-y-0.5">
            {ctaLabel} <span aria-hidden>→</span>
          </a>
          <span className="font-mono mt-3 text-[11px] uppercase tracking-[0.22em] text-ink/50">Free · no card</span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-ink/50" style={{ opacity: heroTextOpacity }}>
          <span>Scroll</span>
          <span className="h-8 w-px bg-ink/30" />
        </div>

        {/* Final copy + CTA */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center bg-gradient-to-t from-paper via-paper/85 to-transparent px-6 pb-12 pt-28 text-center text-ink"
          style={{ opacity: finalTextOpacity, pointerEvents: finalTextOpacity > 0.5 ? "auto" : "none", transform: `translateY(${16 * (1 - finalTextOpacity)}px)` }}
        >
          <h2 className="font-display text-3xl leading-tight md:text-5xl">
            Every look. Same flat. <em className="italic text-honey">Your numbers.</em>
          </h2>
          <a href={ctaHref} className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-7 text-[15px] font-medium text-paper transition-transform hover:-translate-y-0.5">
            {ctaLabel} <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

const LOOKS = [
  { title: "Scandi calm", blurb: "Light oak, wool, one plant too many." },
  { title: "Mid-century warm", blurb: "Walnut and cognac, a record on." },
  { title: "Japandi quiet", blurb: "Low, linen, almost nothing else." },
];

function Still({ src, label, style, frame }: { src: string; label: string; style?: React.CSSProperties; frame?: React.CSSProperties }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className="absolute inset-0 overflow-hidden will-change-transform" style={{ ...frame, ...style }}>
      {missing ? (
        <div className="grid h-full w-full place-items-center bg-[#e8e1d4] text-sm text-ink/50">{label} — add {src}</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" onError={() => setMissing(true)} className="h-full w-full object-cover" draggable={false} />
      )}
    </div>
  );
}

// Multiplies a visibility gate into an animation style's own opacity.
function withVisibility(style: React.CSSProperties, visible: boolean): React.CSSProperties {
  return { ...style, opacity: visible ? (typeof style.opacity === "number" ? style.opacity : 1) : 0 };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
