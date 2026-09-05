"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FLOOR_MATERIALS,
  LIFESTYLE,
  ROOM_LABELS,
  SHOP_TIERS,
  STYLES,
  VIBES,
  WALL_PALETTES,
  type FloorMaterial,
  type Preferences,
  type WallPalette,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { UploadStep, type UploadedPhoto } from "./UploadStep";
import { Chips, OptionCards, StepShell } from "./ui";
import { createProjectAction, finishOnboardingAction } from "./actions";

type StepId =
  | "name"
  | "upload"
  | "walls"
  | "walls_palette"
  | "floor"
  | "floor_material"
  | "floor_tone"
  | "furnish"
  | "style"
  | "shop_tier"
  | "budget"
  | "budget_split"
  | "lifestyle"
  | "vibe"
  | "summary";

const BUDGET_STOPS = [1000, 2500, 5000, 10000, 20000];

export type ExistingProject = { id: string; name: string; photos: UploadedPhoto[] };

export function Wizard({ userId, existing }: { userId: string; existing: ExistingProject | null }) {
  const [projectId, setProjectId] = useState<string | null>(existing?.id ?? null);
  const [name, setName] = useState(existing?.name ?? "");
  const [photos, setPhotos] = useState<UploadedPhoto[]>(existing?.photos ?? []);
  const [prefs, setPrefs] = useState<Preferences>({
    walls: { mode: "auto" },
    floor: { mode: "auto" },
    furnish: true,
    budget: { total: 5000, currency: "EUR", split: "auto" },
    lifestyle: [],
  });
  const [stepIndex, setStepIndex] = useState(existing ? 1 : 0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const rooms = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const p of photos) if (!map.has(p.roomId)) map.set(p.roomId, { id: p.roomId, label: ROOM_LABELS[p.roomType] });
    return [...map.values()];
  }, [photos]);

  const steps: StepId[] = useMemo(() => {
    const s: StepId[] = ["name", "upload"];
    s.push("walls");
    if (prefs.walls?.mode === "change") s.push("walls_palette");
    s.push("floor");
    if (prefs.floor?.mode === "change") {
      s.push("floor_material");
      if (FLOOR_MATERIALS.find((f) => f.id === prefs.floor?.material)?.hasTone) s.push("floor_tone");
    }
    s.push("furnish");
    if (prefs.furnish) {
      s.push("style", "shop_tier", "budget");
      if (prefs.budget?.total != null && rooms.length > 1) s.push("budget_split");
      s.push("lifestyle", "vibe");
    }
    s.push("summary");
    return s;
  }, [prefs, rooms.length]);

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const canContinue = (() => {
    switch (step) {
      case "name":
        return true;
      case "upload":
        return photos.length > 0;
      case "walls":
        return Boolean(prefs.walls?.mode);
      case "walls_palette":
        return Boolean(prefs.walls?.palette);
      case "floor":
        return Boolean(prefs.floor?.mode);
      case "floor_material":
        return Boolean(prefs.floor?.material);
      case "floor_tone":
        return Boolean(prefs.floor?.tone);
      case "style":
        return Boolean(prefs.style);
      case "shop_tier":
        return Boolean(prefs.shop_tier);
      case "vibe":
        return Boolean(prefs.vibe);
      default:
        return true;
    }
  })();

  function next() {
    setError(null);
    if (step === "name" && !projectId) {
      start(async () => {
        try {
          const { projectId: id } = await createProjectAction(name);
          setProjectId(id);
          setStepIndex((i) => i + 1);
        } catch (e) {
          setError((e as Error).message);
        }
      });
      return;
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }
  function finish() {
    if (!projectId) return;
    start(async () => {
      try {
        await finishOnboardingAction({ projectId, preferences: prefs });
      } catch (e) {
        // redirect() throws internally; only surface real errors
        const msg = (e as Error).message ?? "";
        if (!msg.includes("NEXT_REDIRECT")) setError(msg);
      }
    });
  }

  const set = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }));

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {stepIndex + 1} of {steps.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === "name" && (
        <StepShell title="Let's set up your home" subtitle="Give this project a name — an address, a nickname, anything.">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Prenzlauer Berg flat"
            className="w-full rounded-xl border bg-card px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </StepShell>
      )}

      {step === "upload" && projectId && (
        <StepShell title="Upload photos of your rooms" subtitle="We'll detect the room type — correct it if we got it wrong.">
          <UploadStep userId={userId} projectId={projectId} photos={photos} onChange={setPhotos} />
        </StepShell>
      )}

      {step === "walls" && (
        <StepShell title="Walls" subtitle="Paint, keep, or let us decide?">
          <OptionCards
            value={prefs.walls?.mode}
            onChange={(id) => set({ walls: { ...prefs.walls, mode: id as "keep" | "refresh" | "change" | "auto" } })}
            options={[
              { id: "keep", label: "Keep as they are" },
              { id: "refresh", label: "Fresh coat, same feel", blurb: "Clean, neutral, bright" },
              { id: "change", label: "Change the color", blurb: "Pick a color world next" },
              { id: "auto", label: "Not sure — suggest something" },
            ]}
          />
        </StepShell>
      )}

      {step === "walls_palette" && (
        <StepShell title="Which color world?" subtitle="Rough direction is enough — the plan picks the exact tones.">
          <OptionCards
            value={prefs.walls?.palette}
            onChange={(id) => set({ walls: { mode: "change", palette: id as WallPalette } })}
            options={WALL_PALETTES.map((p) => ({ id: p.id, label: p.label, swatches: [...p.swatches] }))}
          />
        </StepShell>
      )}

      {step === "floor" && (
        <StepShell
          title="Floor"
          subtitle={
            photos[0]?.detected.floor_guess ? `Looks like ${photos[0].detected.floor_guess} in the first photo. Keep it?` : "Keep, change, or let us decide?"
          }
        >
          <OptionCards
            value={prefs.floor?.mode}
            onChange={(id) => set({ floor: { ...prefs.floor, mode: id as "keep" | "change" | "auto" } })}
            options={[
              { id: "keep", label: "Keep the floor" },
              { id: "change", label: "Change it", blurb: "Pick a material next" },
              { id: "auto", label: "Not sure — suggest something" },
            ]}
          />
        </StepShell>
      )}

      {step === "floor_material" && (
        <StepShell title="Which floor?">
          <OptionCards
            columns={3}
            value={prefs.floor?.material}
            onChange={(id) => set({ floor: { mode: "change", material: id as FloorMaterial } })}
            options={FLOOR_MATERIALS.map((f) => ({ id: f.id, label: f.label }))}
          />
        </StepShell>
      )}

      {step === "floor_tone" && (
        <StepShell title="Which tone?">
          <OptionCards
            columns={3}
            value={prefs.floor?.tone}
            onChange={(id) => set({ floor: { ...prefs.floor!, tone: id as "light" | "medium" | "dark" } })}
            options={[
              { id: "light", label: "Light", swatches: ["#E8D9C0"] },
              { id: "medium", label: "Medium", swatches: ["#B98E5F"] },
              { id: "dark", label: "Dark", swatches: ["#5C3F2A"] },
            ]}
          />
        </StepShell>
      )}

      {step === "furnish" && (
        <StepShell title="Should we furnish the rooms?">
          <OptionCards
            value={prefs.furnish ? "yes" : "no"}
            onChange={(id) => set({ furnish: id === "yes" })}
            options={[
              { id: "yes", label: "Yes, furnish them", blurb: "Style, budget and a shopping list" },
              { id: "no", label: "No, only walls and floor", blurb: "Keep the rooms empty" },
            ]}
          />
        </StepShell>
      )}

      {step === "style" && (
        <StepShell title="Pick a style" subtitle="It will be applied consistently to every room.">
          <OptionCards
            columns={2}
            value={prefs.style}
            onChange={(id) => set({ style: id as Preferences["style"] })}
            options={STYLES.map((s) => ({ id: s.id, label: s.label, blurb: s.blurb }))}
          />
        </StepShell>
      )}

      {step === "shop_tier" && (
        <StepShell title="Where would you shop?" subtitle="This sets the price level and the look of the pieces.">
          <OptionCards
            value={prefs.shop_tier}
            onChange={(id) => set({ shop_tier: id as Preferences["shop_tier"] })}
            options={SHOP_TIERS.map((s) => ({ id: s.id, label: s.label, blurb: s.blurb }))}
          />
        </StepShell>
      )}

      {step === "budget" && (
        <StepShell title="What's your furniture budget?" subtitle="For everything together. We'll split it across rooms and stick to it.">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 text-3xl font-semibold">
              {prefs.budget?.total == null ? "No fixed budget" : formatCurrency(prefs.budget.total)}
            </div>
            <input
              type="range"
              min={0}
              max={BUDGET_STOPS.length}
              step={1}
              value={prefs.budget?.total == null ? BUDGET_STOPS.length : Math.max(0, BUDGET_STOPS.indexOf(prefs.budget.total))}
              onChange={(e) => {
                const i = Number(e.target.value);
                set({ budget: { currency: "EUR", split: "auto", ...prefs.budget, total: i >= BUDGET_STOPS.length ? null : BUDGET_STOPS[i] } });
              }}
              className="w-full accent-black"
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {BUDGET_STOPS.map((b) => (
                <span key={b}>{b >= 1000 ? `${b / 1000}k` : b}</span>
              ))}
              <span>none</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Or exact:</span>
              <input
                type="number"
                min={0}
                value={prefs.budget?.total ?? ""}
                onChange={(e) => set({ budget: { currency: "EUR", split: "auto", ...prefs.budget, total: e.target.value === "" ? null : Number(e.target.value) } })}
                className="w-32 rounded-lg border px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-muted-foreground">EUR</span>
            </div>
          </div>
        </StepShell>
      )}

      {step === "budget_split" && (
        <StepShell title="Split across rooms?" subtitle="Auto weights living rooms highest, then bedrooms, offices, hallways.">
          <OptionCards
            value={prefs.budget?.split}
            onChange={(id) => set({ budget: { ...prefs.budget!, split: id as "auto" | "manual" } })}
            options={[
              { id: "auto", label: "Split it sensibly for me" },
              { id: "manual", label: "I'll set it per room" },
            ]}
          />
          {prefs.budget?.split === "manual" && (
            <ManualSplit
              rooms={rooms}
              total={prefs.budget.total ?? 0}
              values={prefs.budget.per_room ?? {}}
              onChange={(per_room) => set({ budget: { ...prefs.budget!, per_room } })}
            />
          )}
        </StepShell>
      )}

      {step === "lifestyle" && (
        <StepShell title="Anything we should plan around?" subtitle="Pick all that apply — it changes materials and layout.">
          <Chips
            options={[...LIFESTYLE]}
            values={prefs.lifestyle ?? []}
            onToggle={(id) =>
              set({ lifestyle: prefs.lifestyle?.includes(id) ? prefs.lifestyle.filter((x) => x !== id) : [...(prefs.lifestyle ?? []), id] })
            }
          />
        </StepShell>
      )}

      {step === "vibe" && (
        <StepShell title="When you walk in, it should feel…">
          <OptionCards value={prefs.vibe} onChange={(id) => set({ vibe: id })} options={VIBES.map((v) => ({ id: v.id, label: v.label }))} />
        </StepShell>
      )}

      {step === "summary" && (
        <StepShell title="Here's your brief" subtitle="Change anything later via the chat on the dashboard.">
          <Summary prefs={prefs} rooms={rooms} />
          <textarea
            value={prefs.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Anything else? e.g. 'the piano must stay in the corner', 'I love plants'"
            rows={3}
            className="mt-4 w-full rounded-xl border bg-card px-4 py-3 outline-none focus:ring-2 focus:ring-foreground/10"
          />
        </StepShell>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={stepIndex === 0 || pending}>
          <ArrowLeft size={16} /> Back
        </Button>
        {step === "summary" ? (
          <Button size="lg" onClick={finish} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} Generate my rooms
          </Button>
        ) : (
          <Button onClick={next} disabled={!canContinue || pending}>
            {pending ? <Loader2 className="animate-spin" size={16} /> : null} Continue <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}

function ManualSplit({
  rooms,
  total,
  values,
  onChange,
}: {
  rooms: { id: string; label: string }[];
  total: number;
  values: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const sum = rooms.reduce((a, r) => a + (values[r.id] ?? 0), 0);
  return (
    <div className="mt-4 space-y-2 rounded-xl border bg-card p-4">
      {rooms.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3">
          <span className="text-sm">{r.label}</span>
          <input
            type="number"
            min={0}
            value={values[r.id] ?? ""}
            onChange={(e) => onChange({ ...values, [r.id]: Number(e.target.value) })}
            className="w-28 rounded-lg border px-2 py-1 text-sm"
          />
        </div>
      ))}
      <div className={`pt-2 text-right text-sm ${sum > total ? "text-danger" : "text-muted-foreground"}`}>
        {formatCurrency(sum)} of {formatCurrency(total)}
      </div>
    </div>
  );
}

function Summary({ prefs, rooms }: { prefs: Preferences; rooms: { id: string; label: string }[] }) {
  const rows: [string, string][] = [
    ["Rooms", rooms.map((r) => r.label).join(", ")],
    ["Walls", `${prefs.walls?.mode ?? "auto"}${prefs.walls?.palette ? ` · ${WALL_PALETTES.find((p) => p.id === prefs.walls?.palette)?.label}` : ""}`],
    ["Floor", `${prefs.floor?.mode ?? "auto"}${prefs.floor?.material ? ` · ${FLOOR_MATERIALS.find((f) => f.id === prefs.floor?.material)?.label}` : ""}${prefs.floor?.tone ? ` (${prefs.floor.tone})` : ""}`],
  ];
  if (prefs.furnish) {
    rows.push(["Style", STYLES.find((s) => s.id === prefs.style)?.label ?? "—"]);
    rows.push(["Shopping", SHOP_TIERS.find((s) => s.id === prefs.shop_tier)?.label ?? "—"]);
    rows.push(["Budget", prefs.budget?.total == null ? "No fixed budget" : `${formatCurrency(prefs.budget.total)} · split ${prefs.budget.split}`]);
    if (prefs.lifestyle?.length) rows.push(["Lifestyle", prefs.lifestyle.join(", ")]);
    rows.push(["Feel", VIBES.find((v) => v.id === prefs.vibe)?.label ?? "—"]);
  } else rows.push(["Furniture", "No furniture changes"]);
  return (
    <dl className="divide-y rounded-xl border bg-card">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-6 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
