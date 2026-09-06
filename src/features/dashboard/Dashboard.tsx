"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { FurnishingPlan, Preferences, StackCard } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import type { StackState } from "@/lib/pipeline";
import { OriginalCard } from "./OriginalCard";
import { SwipeStack } from "./SwipeStack";
import { ChatBar, type ChatBarHandle } from "./ChatBar";
import { editAction, getStackAction, joinWaitlistAction, swipeAction } from "./actions";

export type DashboardPhoto = {
  id: string;
  roomId: string | null;
  roomLabel: string;
  url: string;
  width: number | null;
  height: number | null;
};

type Project = {
  id: string;
  name: string;
  plan: FurnishingPlan | null;
  planStatus: "none" | "building" | "ready" | "failed";
  preferences: Preferences;
};

const POLL_MS = 2500;

export function Dashboard({ project, photos }: { project: Project; photos: DashboardPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [stacks, setStacks] = useState<Record<string, StackState>>({});
  const [likeCard, setLikeCard] = useState<StackCard | null>(null);
  const [editCard, setEditCard] = useState<StackCard | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);
  const [plan, setPlan] = useState(project.plan);
  const chatRef = useRef<ChatBarHandle>(null);
  const toast = useToast();
  const [, start] = useTransition();

  const photo = photos[index];
  const nextPhoto = photos.length > 1 ? photos[(index + 1) % photos.length] : null;
  const stack = stacks[photo.id];

  // Cards the user already swiped in this session. A poll that started before
  // the swipe was saved must never bring them back.
  const dismissedRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async (photoId: string) => {
    try {
      const raw = await getStackAction(photoId);
      const state = { ...raw, cards: raw.cards.filter((c) => !dismissedRef.current.has(c.id)) };
      setStacks((s) => ({ ...s, [photoId]: state }));
      return state;
    } catch (e) {
      console.error(e);
      return null;
    }
  }, []);

  // Load the current photo's stack. Only the current room is generated —
  // other rooms start generating when you switch to them.
  useEffect(() => {
    const t = window.setTimeout(() => refresh(photo.id), 0);
    return () => window.clearTimeout(t);
  }, [photo.id, refresh]);

  // Poll while anything is in flight (plan building or cards generating).
  useEffect(() => {
    const inflight = (s?: StackState) => !s || s.planStatus !== "ready" || s.cards.some((c) => c.status !== "ready") || (s.cards.length === 0 && !s.limitReached);
    if (!inflight(stacks[photo.id])) return;
    const t = window.setInterval(() => refresh(photo.id), POLL_MS);
    return () => window.clearInterval(t);
  }, [stacks, photo.id, refresh]);

  // Preload the next original photo.
  useEffect(() => {
    if (nextPhoto?.url) {
      const img = new Image();
      img.src = nextPhoto.url;
    }
  }, [nextPhoto]);

  function removeCardLocally(photoId: string, cardId: string) {
    dismissedRef.current.add(cardId);
    setStacks((s) => {
      const cur = s[photoId];
      if (!cur) return s;
      return { ...s, [photoId]: { ...cur, cards: cur.cards.filter((c) => c.id !== cardId) } };
    });
  }

  function handleDislike(card: StackCard) {
    removeCardLocally(photo.id, card.id);
    start(async () => {
      await swipeAction({ generationId: card.id, action: "dislike" });
      refresh(photo.id);
    });
  }

  function handleLike(card: StackCard) {
    setLikeCard(card);
  }

  function confirmLike(addToLibrary: boolean, note: string) {
    const card = likeCard;
    if (!card) return;
    setLikeCard(null);
    removeCardLocally(photo.id, card.id);
    start(async () => {
      await swipeAction({ generationId: card.id, action: "like", addToLibrary, note });
      if (addToLibrary) toast.push({ title: "Added to your library", tone: "success", durationMs: 3000 });
      refresh(photo.id);
    });
  }

  function submitEdit(instruction: string) {
    const card = editCard;
    if (!card) return;
    setEditCard(null);
    start(async () => {
      const res = await editAction({ photoId: photo.id, generationId: card.id, instruction });
      if (res.limitReached) toast.push({ title: "Daily limit reached", description: "Join the waitlist for full access.", tone: "danger" });
      else toast.push({ title: "Editing…", description: "The edited version lands on top of the stack.", durationMs: 3000 });
      refresh(photo.id);
    });
  }

  function onChatApplied(regenerated: boolean) {
    if (regenerated) {
      setStacks({});
      setPlan(null);
      toast.push({ title: "Preferences updated", description: "Rebuilding the plan and regenerating your rooms.", tone: "success" });
      refresh(photo.id);
    } else {
      toast.push({ title: "Saved", tone: "success", durationMs: 2500 });
    }
  }

  function joinWaitlist() {
    start(async () => {
      await joinWaitlistAction();
      setWaitlisted(true);
      toast.push({ title: "You're on the list", tone: "success" });
    });
  }

  // Keep the plan in sync once it's rebuilt (for the "Why this look?" panel).
  useEffect(() => {
    if (!plan && stack?.planStatus === "ready") {
      fetch("/api/plan")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d?.plan && setPlan(d.plan))
        .catch(() => {});
    }
  }, [plan, stack?.planStatus]);

  const roomPlan = plan?.rooms.find((r) => r.room_id === photo.roomId);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <p className="text-xs text-muted-foreground">Swipe right to keep, left to skip. Everything is generated from one plan, so all rooms match.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPlan(true)}>
          <Info size={14} /> Why this look?
        </Button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 pb-10 md:flex-row md:items-start md:gap-14 md:pt-6">
        <OriginalCard
          photo={photo}
          index={index}
          total={photos.length}
          onPrev={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
          onNext={() => setIndex((i) => (i + 1) % photos.length)}
        />
        <SwipeStack
          cards={stack?.cards ?? []}
          planStatus={stack?.planStatus ?? project.planStatus}
          limitReached={stack?.limitReached ?? false}
          onLike={handleLike}
          onDislike={handleDislike}
          onEdit={setEditCard}
          onJoinWaitlist={joinWaitlist}
          waitlisted={waitlisted}
        />
      </main>

      <ChatBar ref={chatRef} currentPhotoId={photo.id} onApplied={onChatApplied} />

      <Dialog open={Boolean(likeCard)} onClose={() => setLikeCard(null)} title="Save this one?">
        <LikeForm card={likeCard} onConfirm={confirmLike} />
      </Dialog>

      <Dialog open={Boolean(editCard)} onClose={() => setEditCard(null)} title="Edit this image">
        <EditForm onSubmit={submitEdit} />
      </Dialog>

      <Dialog open={showPlan} onClose={() => setShowPlan(false)} title="Why this look?" className="max-w-lg">
        {plan ? (
          <div className="space-y-4 text-sm">
            <p>{plan.style_guide.summary}</p>
            <div className="flex flex-wrap gap-2">
              {plan.style_guide.palette.map((p) => (
                <span key={p.hex} className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs">
                  <span className="h-3 w-3 rounded-full border" style={{ background: p.hex }} /> {p.name}
                </span>
              ))}
            </div>
            {roomPlan && (
              <div>
                <p className="font-medium">
                  {roomPlan.label}
                  {roomPlan.budget != null && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatCurrency(roomPlan.total)} of {formatCurrency(roomPlan.budget)}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-muted-foreground">Floor: {roomPlan.floor}</p>
                {roomPlan.items.length > 0 && (
                  <ul className="mt-2 divide-y rounded-lg border">
                    {roomPlan.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-4 px-3 py-2">
                        <span>{it.item}</span>
                        <span className="shrink-0 text-muted-foreground">~{formatCurrency(it.est_price)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Prices are estimates for the chosen shopping tier, not live offers.</p>
              </div>
            )}
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 size={14} className="animate-spin" /> The plan is being created…
          </p>
        )}
      </Dialog>
    </div>
  );
}

function LikeForm({ card, onConfirm }: { card: StackCard | null; onConfirm: (add: boolean, note: string) => void }) {
  const [note, setNote] = useState("");
  if (!card) return null;
  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={card.url ?? ""} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note, e.g. 'love the rug'"
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onConfirm(false, note)}>
          Just continue
        </Button>
        <Button onClick={() => onConfirm(true, note)}>Add to library</Button>
      </div>
      <p className="text-xs text-muted-foreground">Liked images also guide the style of your other rooms.</p>
    </div>
  );
}

function EditForm({ onSubmit }: { onSubmit: (instruction: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
      className="space-y-3"
    >
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="e.g. 'swap the sofa for a green velvet one', 'remove the plant', 'warmer light'"
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!text.trim()}>
          Apply edit
        </Button>
      </div>
    </form>
  );
}
