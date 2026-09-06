"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { RoomPlan } from "@/lib/types";
import { RemoveFromLibrary } from "./RemoveFromLibrary";

export type LibraryImage = { id: string; url: string; note: string | null; createdAt: string };
export type LibraryGroup = { roomId: string; label: string; images: LibraryImage[]; plan: RoomPlan | null };

export function LibraryGallery({ groups }: { groups: LibraryGroup[] }) {
  const [openRoom, setOpenRoom] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ roomId: string; index: number } | null>(null);

  const group = groups.find((g) => g.roomId === openRoom) ?? null;
  const viewerGroup = groups.find((g) => g.roomId === viewer?.roomId) ?? null;

  const step = useCallback(
    (dir: 1 | -1) => {
      setViewer((v) => {
        if (!v) return v;
        const g = groups.find((x) => x.roomId === v.roomId);
        if (!g || g.images.length === 0) return null;
        return { ...v, index: (v.index + dir + g.images.length) % g.images.length };
      });
    },
    [groups],
  );

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Escape") setViewer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, step]);

  // If the shown image was removed, clamp to the last one (derived, no effect needed).
  const viewerIndex = viewer && viewerGroup ? Math.min(viewer.index, viewerGroup.images.length - 1) : -1;
  const current = viewerIndex >= 0 ? viewerGroup!.images[viewerIndex] : null;

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((g) => (
          <button key={g.roomId} onClick={() => (g.images.length === 1 ? setViewer({ roomId: g.roomId, index: 0 }) : setOpenRoom(g.roomId))} className="group text-left">
            <div className="relative aspect-[3/4]">
              {/* stacked look: up to two cards peeking out behind the top one */}
              {g.images.slice(1, 3).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="absolute inset-0 h-full w-full rounded-xl border object-cover card-shadow transition-transform"
                  style={{ transform: `translate(${(i + 1) * 6}px, ${-(i + 1) * 6}px) rotate(${(i + 1) * 2}deg)`, zIndex: 2 - i, opacity: 0.9 - i * 0.2 }}
                />
              ))}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.images[0].url} alt={g.label} className="relative z-10 h-full w-full rounded-xl border object-cover card-shadow transition-transform group-hover:-translate-y-1" />
              {g.images.length > 1 && (
                <span className="absolute right-2 top-2 z-20 rounded-full bg-black/70 px-2 py-0.5 text-xs font-medium text-white">{g.images.length}</span>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between px-1">
              <p className="text-sm font-medium">{g.label}</p>
              <p className="text-xs text-muted-foreground">
                {g.images.length} {g.images.length === 1 ? "image" : "images"}
                {g.plan && g.plan.items.length > 0 && ` · ~${formatCurrency(g.plan.total)}`}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Grid of one room */}
      <Dialog open={Boolean(group)} onClose={() => setOpenRoom(null)} title={group?.label} className="max-w-4xl">
        {group && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.images.map((img, i) => (
                <div key={img.id} className="group relative">
                  <button onClick={() => setViewer({ roomId: group.roomId, index: i })} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="aspect-[3/4] w-full rounded-lg border object-cover transition-opacity hover:opacity-90" />
                  </button>
                  <div className="absolute right-1.5 top-1.5 rounded-md bg-card/90 opacity-0 transition-opacity group-hover:opacity-100">
                    <RemoveFromLibrary id={img.id} />
                  </div>
                  {img.note && <p className="mt-1 truncate text-xs text-muted-foreground">“{img.note}”</p>}
                </div>
              ))}
            </div>
            {group.plan && group.plan.items.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">Shopping list · ~{formatCurrency(group.plan.total)}</summary>
                <ul className="mt-1 space-y-0.5">
                  {group.plan.items.map((x, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{x.item}</span>
                      <span className="shrink-0 text-muted-foreground">~{formatCurrency(x.est_price)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </Dialog>

      {/* Fullscreen viewer */}
      {viewer && viewerGroup && current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95" role="dialog" aria-modal="true">
          <button onClick={() => setViewer(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close">
            <X size={20} />
          </button>
          <div className="absolute left-4 top-4 text-sm text-white/80">
            {viewerGroup.label} · {viewerIndex + 1} / {viewerGroup.images.length}
          </div>
          {viewerGroup.images.length > 1 && (
            <>
              <button onClick={() => step(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous">
                <ChevronLeft size={24} />
              </button>
              <button onClick={() => step(1)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next">
                <ChevronRight size={24} />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" onClick={() => step(1)} />
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 text-sm text-white/80">
            {current.note && <span>“{current.note}”</span>}
            <a href={current.url} download className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">
              <Download size={14} /> Download
            </a>
          </div>
        </div>
      )}
    </>
  );
}
