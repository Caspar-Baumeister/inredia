"use client";

import { forwardRef, useImperativeHandle, useRef, useState, useTransition } from "react";
import { Loader2, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyChatAction, chatPreviewAction, type ChatPreview } from "./actions";

export type ChatBarHandle = { prefill: (text: string) => void };

export const ChatBar = forwardRef<ChatBarHandle, { currentPhotoId: string | null; onApplied: (regenerated: boolean) => void }>(
  function ChatBar({ currentPhotoId, onApplied }, ref) {
    const [text, setText] = useState("");
    const [preview, setPreview] = useState<ChatPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, start] = useTransition();
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      prefill(t) {
        setText(t);
        setPreview(null);
        inputRef.current?.focus();
      },
    }));

    function submit() {
      const msg = text.trim();
      if (!msg) return;
      setError(null);
      start(async () => {
        try {
          setPreview(await chatPreviewAction(msg));
        } catch (e) {
          setError((e as Error).message);
        }
      });
    }

    function apply() {
      if (!preview) return;
      start(async () => {
        try {
          const res = await applyChatAction(preview, currentPhotoId);
          setPreview(null);
          setText("");
          onApplied(res.regenerated);
        } catch (e) {
          setError((e as Error).message);
        }
      });
    }

    return (
      <div className="sticky bottom-0 z-20 border-t bg-background/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {preview && (
            <div className="mb-3 rounded-xl border bg-card p-4 card-shadow fade-up">
              <p className="text-sm font-medium">{preview.diff.requires_regeneration ? "Here's what will change" : "Nothing to change"}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {preview.diff.summary.length ? preview.diff.summary.map((l, i) => <li key={i}>• {l}</li>) : <li>No changes detected.</li>}
                {preview.diff.avoid_rules_add?.map((r) => (
                  <li key={r}>• New rule: avoid {r}</li>
                ))}
                {preview.diff.avoid_rules_remove?.length ? <li>• Removes {preview.diff.avoid_rules_remove.length} rule(s)</li> : null}
              </ul>
              {preview.diff.requires_regeneration && preview.discardCount > 0 && (
                <p className="mt-2 text-xs text-danger">This discards {preview.discardCount} generated image{preview.discardCount === 1 ? "" : "s"} and regenerates with the new plan.</p>
              )}
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)} disabled={pending}>
                  Cancel
                </Button>
                <Button size="sm" onClick={apply} disabled={pending || !preview.diff.requires_regeneration && !preview.diff.avoid_rules_add?.length && !preview.diff.avoid_rules_remove?.length}>
                  {pending ? <Loader2 size={14} className="animate-spin" /> : null} Apply
                </Button>
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 card-shadow"
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Change anything: “oak herringbone floor”, “budget 8k”, “more plants”, “less grey”…"
              className="flex-1 bg-transparent text-sm outline-none"
              disabled={pending}
            />
            <button type="submit" disabled={pending || !text.trim()} className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-white disabled:opacity-40" aria-label="Send">
              {pending && !preview ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      </div>
    );
  },
);
