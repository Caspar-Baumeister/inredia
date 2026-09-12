"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { FurnishingPlan, Preferences, StackCard } from "@/lib/types";
import type { StackState } from "@/lib/pipeline";
import { OriginalCard } from "./OriginalCard";
import { SwipeStack } from "./SwipeStack";
import { ChatBar, type ChatBarHandle } from "./ChatBar";
import { editAction, getStackAction, peekStackAction, swipeAction } from "./actions";
import { usePro } from "@/features/pro/UpgradeDialog";

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

const POLL_MS = 1500;
// Other rooms keep rendering in the background; we follow them at a calmer pace.
const BACKGROUND_POLL_MS = 4000;

export function Dashboard({ project, photos }: { project: Project; photos: DashboardPhoto[] }) {
  const [index, setIndex] = useState(0);
  const [stacks, setStacks] = useState<Record<string, StackState>>({});
  const [likeCard, setLikeCard] = useState<StackCard | null>(null);
  const [editCard, setEditCard] = useState<StackCard | null>(null);
  const chatRef = useRef<ChatBarHandle>(null);
  const toast = useToast();
  const { openPro } = usePro();
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

  // Read-only: follows a room that is still rendering without asking for more images.
  const peek = useCallback(async (photoId: string) => {
    try {
      const raw = await peekStackAction(photoId);
      setStacks((s) => {
        const cur = s[photoId];
        const cards = raw.cards.filter((c) => !dismissedRef.current.has(c.id));
        return { ...s, [photoId]: { ...raw, limitReached: cur?.limitReached ?? false, cards } };
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Load the current photo's stack. Switching rooms never cancels what is
  // already running — the other rooms keep finishing in the background.
  useEffect(() => {
    const t = window.setTimeout(() => refresh(photo.id), 0);
    return () => window.clearTimeout(t);
  }, [photo.id, refresh]);

  // Follow every other room that still has images in flight, so coming back to
  // it shows a finished stack instead of restarting the wait.
  const backgroundIds = photos
    .filter((p) => p.id !== photo.id)
    .filter((p) => {
      const s = stacks[p.id];
      return s ? s.cards.some((c) => c.status !== "ready") : false;
    })
    .map((p) => p.id)
    .join(",");

  useEffect(() => {
    if (!backgroundIds) return;
    const ids = backgroundIds.split(",");
    const t = window.setInterval(() => ids.forEach((id) => peek(id)), BACKGROUND_POLL_MS);
    return () => window.clearInterval(t);
  }, [backgroundIds, peek]);

  // Learn once what the other rooms already have (cheap, read-only).
  const otherIds = photos.filter((p) => p.id !== photo.id).map((p) => p.id).join(",");
  useEffect(() => {
    if (!otherIds) return;
    const t = window.setTimeout(() => otherIds.split(",").forEach((id) => peek(id)), 800);
    return () => window.clearTimeout(t);
  }, [otherIds, peek]);

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

  // Preload the first finished card of every other room so switching is instant.
  const otherReady = Object.entries(stacks)
    .filter(([id]) => id !== photo.id)
    .map(([, s]) => s.cards.find((c) => c.status === "ready" && c.url)?.url)
    .filter((u): u is string => Boolean(u))
    .join("|");
  useEffect(() => {
    if (!otherReady) return;
    for (const url of otherReady.split("|")) {
      const img = new Image();
      img.src = url;
    }
  }, [otherReady]);

  const renderingElsewhere = photos.filter((p) => p.id !== photo.id && stacks[p.id]?.cards.some((c) => c.status !== "ready")).length;

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
      if (res.limitReached) openPro("image_limit");
      else toast.push({ title: "Editing…", description: "The edited version lands on top of the stack.", durationMs: 3000 });
      refresh(photo.id);
    });
  }

  function onChatApplied(regenerated: boolean) {
    if (regenerated) {
      setStacks({});
      toast.push({ title: "Preferences updated", description: "Rebuilding the plan and regenerating your rooms.", tone: "success" });
      refresh(photo.id);
    } else {
      toast.push({ title: "Saved", tone: "success", durationMs: 2500 });
    }
  }

  function showPlans() {
    openPro("image_limit");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <p className="text-xs text-muted-foreground">Swipe right to keep, left to skip. Everything is generated from one plan, so all rooms match.</p>
        </div>
        {renderingElsewhere > 0 && (
          <p className="hidden text-xs text-muted-foreground sm:block">
            {renderingElsewhere} other {renderingElsewhere === 1 ? "room is" : "rooms are"} rendering in the background
          </p>
        )}
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
          onShowPlans={showPlans}
        />
      </main>

      <ChatBar ref={chatRef} currentPhotoId={photo.id} onApplied={onChatApplied} />

      <Dialog open={Boolean(likeCard)} onClose={() => setLikeCard(null)} title="Save this one?">
        <LikeForm card={likeCard} onConfirm={confirmLike} />
      </Dialog>

      <Dialog open={Boolean(editCard)} onClose={() => setEditCard(null)} title="Edit this image">
        <EditForm onSubmit={submitEdit} />
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
