"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, X, Loader2, Sparkles } from "lucide-react";
import type { StackCard } from "@/lib/types";
import { cn } from "@/lib/utils";

const THRESHOLD = 110;

export function SwipeStack({
  cards,
  planStatus,
  limitReached,
  onLike,
  onDislike,
  onEdit,
  onJoinWaitlist,
  waitlisted,
}: {
  cards: StackCard[];
  planStatus: "none" | "building" | "ready" | "failed";
  limitReached: boolean;
  onLike: (card: StackCard) => void;
  onDislike: (card: StackCard) => void;
  onEdit: (card: StackCard) => void;
  onJoinWaitlist: () => void;
  waitlisted: boolean;
}) {
  const ready = cards.filter((c) => c.status === "ready" && c.url);
  const top = ready[0];
  const pending = cards.filter((c) => c.status !== "ready").length;

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [leaving, setLeaving] = useState<{ id: string; dir: 1 | -1 } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Preload the next ready image so the reveal after a swipe is instant.
  useEffect(() => {
    const next = ready[1];
    if (next?.url) {
      const img = new Image();
      img.src = next.url;
    }
  }, [ready]);

  function fling(dir: 1 | -1) {
    if (!top || leaving) return;
    setLeaving({ id: top.id, dir });
    window.setTimeout(() => {
      setLeaving(null);
      setDrag(null);
      if (dir === 1) onLike(top);
      else onDislike(top);
    }, 220);
  }

  const dx = drag?.x ?? 0;
  const rot = dx / 18;
  const likeOpacity = Math.min(1, Math.max(0, dx / THRESHOLD));
  const nopeOpacity = Math.min(1, Math.max(0, -dx / THRESHOLD));

  return (
    <div className="flex w-full max-w-[380px] flex-col items-center">
      <div className="relative w-full" style={{ aspectRatio: "3 / 4" }}>
        {/* backing cards */}
        {ready.slice(1, 3).map((c, i) => (
          <div
            key={c.id}
            className="absolute inset-0 overflow-hidden rounded-2xl bg-muted stack-shadow"
            style={{ transform: `translate(${(i + 1) * 10}px, ${(i + 1) * 6}px) scale(${1 - (i + 1) * 0.03})`, zIndex: 5 - i, opacity: 0.9 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.url!} alt="" className="h-full w-full object-cover" draggable={false} />
          </div>
        ))}

        {top ? (
          <div
            key={top.id}
            className={cn("absolute inset-0 z-10 cursor-grab overflow-hidden rounded-2xl bg-muted stack-shadow no-select active:cursor-grabbing", !drag && "transition-transform duration-200")}
            style={{
              transform: leaving
                ? `translate(${leaving.dir * 700}px, ${dx ? drag?.y : 0}px) rotate(${leaving.dir * 25}deg)`
                : `translate(${dx}px, ${drag?.y ?? 0}px) rotate(${rot}deg)`,
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              startRef.current = { x: e.clientX, y: e.clientY };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!startRef.current) return;
              setDrag({ x: e.clientX - startRef.current.x, y: (e.clientY - startRef.current.y) * 0.3 });
            }}
            onPointerUp={() => {
              startRef.current = null;
              if (dx > THRESHOLD) fling(1);
              else if (dx < -THRESHOLD) fling(-1);
              else setDrag(null);
            }}
            onPointerCancel={() => {
              startRef.current = null;
              setDrag(null);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={top.url!} alt="Generated variant" className="h-full w-full object-cover" draggable={false} />
            <div className="pointer-events-none absolute left-4 top-4 rounded-lg border-2 border-success px-3 py-1 text-lg font-bold uppercase text-success" style={{ opacity: likeOpacity, transform: "rotate(-12deg)" }}>
              Like
            </div>
            <div className="pointer-events-none absolute right-4 top-4 rounded-lg border-2 border-danger px-3 py-1 text-lg font-bold uppercase text-danger" style={{ opacity: nopeOpacity, transform: "rotate(12deg)" }}>
              Nope
            </div>
            {top.kind === "edit" && (
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">Edited</span>
            )}
          </div>
        ) : (
          <Placeholder planStatus={planStatus} limitReached={limitReached} pending={pending} onJoinWaitlist={onJoinWaitlist} waitlisted={waitlisted} />
        )}
      </div>

      {pending > 0 && top && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 size={12} className="animate-spin" /> {pending} more on the way
        </p>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => fling(-1)}
          disabled={!top}
          className="grid h-16 w-16 place-items-center rounded-full bg-card text-danger card-shadow transition-transform hover:scale-105 disabled:opacity-40"
          aria-label="Dislike"
        >
          <X size={28} />
        </button>
        <button
          onClick={() => top && onEdit(top)}
          disabled={!top}
          className="flex h-12 items-center gap-2 rounded-full bg-card px-5 text-sm font-medium card-shadow transition-transform hover:scale-105 disabled:opacity-40"
        >
          <Pencil size={16} /> Edit
        </button>
        <button
          onClick={() => fling(1)}
          disabled={!top}
          className="grid h-16 w-16 place-items-center rounded-full bg-card text-success card-shadow transition-transform hover:scale-105 disabled:opacity-40"
          aria-label="Like"
        >
          <Check size={28} />
        </button>
      </div>
      <div className="mt-2 flex w-[232px] justify-between text-[10px] text-muted-foreground">
        <span>← swipe left</span>
        <span>swipe right →</span>
      </div>
    </div>
  );
}

function Placeholder({
  planStatus,
  limitReached,
  pending,
  onJoinWaitlist,
  waitlisted,
}: {
  planStatus: string;
  limitReached: boolean;
  pending: number;
  onJoinWaitlist: () => void;
  waitlisted: boolean;
}) {
  if (limitReached && pending === 0) {
    return (
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl border bg-card p-8 text-center stack-shadow">
        <Sparkles className="mb-3 text-accent" />
        <p className="font-semibold">Image limit reached</p>
        <p className="mt-1 text-sm text-muted-foreground">Paid plans refill every day. Pick one to keep going.</p>
        {waitlisted ? (
          <p className="mt-4 rounded-full bg-success-soft px-4 py-2 text-sm text-success">You&apos;re on the list</p>
        ) : (
          <button onClick={onJoinWaitlist} className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90">
            See plans
          </button>
        )}
      </div>
    );
  }
  const label =
    planStatus === "building" || planStatus === "none"
      ? "Creating your furnishing plan…"
      : planStatus === "failed"
        ? "Plan failed — try adjusting your preferences in the chat."
        : "Rendering your room…";
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center overflow-hidden rounded-2xl stack-shadow shimmer">
      <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium backdrop-blur">
        <span className="inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> {label}
        </span>
      </div>
    </div>
  );
}
