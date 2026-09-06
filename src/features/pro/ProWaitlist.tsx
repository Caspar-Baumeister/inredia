"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SITE } from "@/lib/site";
import { joinProWaitlistAction, type WaitlistSource } from "./actions";

type Ctx = { openPro: (source: WaitlistSource) => void };
const ProContext = React.createContext<Ctx>({ openPro: () => {} });

export function usePro() {
  return React.useContext(ProContext);
}

const COPY: Record<WaitlistSource, { title: string; body: string }> = {
  upgrade: { title: "inredia Pro is on its way", body: "Unlimited images, several projects and more control over every room." },
  image_limit: { title: "You've used your free images", body: `The free plan includes ${SITE.freeImageLimit} images. Pro removes the limit — get on the list and you'll be among the first in.` },
  new_project: { title: "More projects come with Pro", body: "The free plan includes one project. Pro lets you plan as many homes as you like." },
  other: { title: "inredia Pro", body: "Get on the list and we'll let you know the moment it launches." },
};

export function ProProvider({ children, userEmail }: { children: React.ReactNode; userEmail: string }) {
  const [source, setSource] = React.useState<WaitlistSource | null>(null);
  const [email, setEmail] = React.useState(userEmail);
  const [note, setNote] = React.useState("");
  const [state, setState] = React.useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const openPro = React.useCallback((s: WaitlistSource) => {
    setSource(s);
    setState("idle");
    setError(null);
  }, []);
  const close = () => setSource(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!source) return;
    setState("sending");
    try {
      await joinProWaitlistAction({ email, source, note });
      setState("done");
    } catch (err) {
      setState("error");
      setError((err as Error).message);
    }
  }

  const copy = source ? COPY[source] : COPY.other;
  const xLink = (
    <a href={SITE.xUrl} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
      {SITE.xHandle}
    </a>
  );

  return (
    <ProContext.Provider value={{ openPro }}>
      {children}
      <Dialog open={Boolean(source)} onClose={close} title={copy.title}>
        {state === "done" ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-lg bg-success-soft px-3 py-2 text-success">You&apos;re on the list — thank you!</p>
            <p className="text-muted-foreground">Want early access sooner? Send me a message on X {xLink} — I&apos;m the solo founder and happy to let people in.</p>
            <div className="flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-sm">
            <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft px-3 py-3">
              <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
              <p>{copy.body}</p>
            </div>
            <label className="block">
              <span className="text-xs text-muted-foreground">Email for the launch</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted-foreground">What would you use Pro for? (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-foreground/10"
              />
            </label>
            {error && <p className="text-danger">{error}</p>}
            <p className="text-xs text-muted-foreground">Or ping me on X {xLink} for early access.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Not now
              </Button>
              <Button type="submit" disabled={state === "sending"}>
                {state === "sending" ? "Joining…" : "Join the Pro waitlist"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </ProContext.Provider>
  );
}
