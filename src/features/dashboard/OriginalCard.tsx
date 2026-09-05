"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DashboardPhoto } from "./Dashboard";

export function OriginalCard({
  photo,
  index,
  total,
  onPrev,
  onNext,
}: {
  photo: DashboardPhoto;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex w-full max-w-[380px] flex-col rounded-2xl bg-card p-5 card-shadow">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Your photo</p>
          <p className="text-xs text-muted-foreground">
            {photo.roomLabel} · {index + 1}/{total}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={onPrev} disabled={total < 2} className="rounded-full border p-1.5 hover:bg-muted disabled:opacity-40" aria-label="Previous photo">
            <ChevronLeft size={16} />
          </button>
          <button onClick={onNext} disabled={total < 2} className="rounded-full border p-1.5 hover:bg-muted disabled:opacity-40" aria-label="Next photo">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-xl bg-muted" style={{ aspectRatio: "3 / 4" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.roomLabel} className="h-full w-full object-cover" draggable={false} />
      </div>
    </div>
  );
}
