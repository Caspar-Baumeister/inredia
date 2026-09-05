import "server-only";
import { generateJson } from "./gemini";
import {
  ROOM_BUDGET_WEIGHT,
  ROOM_LABELS,
  STYLES,
  SHOP_TIERS,
  WALL_PALETTES,
  FLOOR_MATERIALS,
  type FurnishingPlan,
  type PhotoRow,
  type Preferences,
  type RoomPlan,
  type RoomRow,
} from "@/lib/types";

// Splits the total budget across rooms. Manual per-room values win; the rest is
// distributed by room-type weight. Returns null budgets when there is no budget.
export function splitBudget(prefs: Preferences, rooms: RoomRow[]): Record<string, number | null> {
  const total = prefs.budget?.total ?? null;
  const out: Record<string, number | null> = {};
  if (!prefs.furnish || total == null) {
    for (const r of rooms) out[r.id] = null;
    return out;
  }
  if (prefs.budget?.split === "manual" && prefs.budget.per_room) {
    for (const r of rooms) out[r.id] = Math.round(prefs.budget.per_room[r.id] ?? 0);
    return out;
  }
  const weights = rooms.map((r) => r.budget_share ?? ROOM_BUDGET_WEIGHT[r.type] ?? 1);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  rooms.forEach((r, i) => (out[r.id] = Math.round((total * weights[i]) / sum)));
  return out;
}

export function describePreferences(prefs: Preferences): string {
  const style = STYLES.find((s) => s.id === prefs.style);
  const tier = SHOP_TIERS.find((s) => s.id === prefs.shop_tier);
  const palette = WALL_PALETTES.find((p) => p.id === prefs.walls?.palette);
  const floor = FLOOR_MATERIALS.find((f) => f.id === prefs.floor?.material);
  const lines = [
    `Walls: ${prefs.walls?.mode ?? "auto"}${palette ? ` — ${palette.label}` : ""}`,
    `Floor: ${prefs.floor?.mode ?? "auto"}${floor ? ` — ${floor.label}${prefs.floor?.tone ? ` (${prefs.floor.tone})` : ""}` : ""}`,
    `Furnish: ${prefs.furnish ? "yes" : "no"}`,
  ];
  if (prefs.furnish) {
    lines.push(`Style: ${style ? `${style.label} — ${style.blurb}` : "surprise me"}`);
    lines.push(`Shopping tier: ${tier ? `${tier.label} — ${tier.blurb}` : "mixed"}`);
    lines.push(
      `Budget: ${prefs.budget?.total != null ? `${prefs.budget.total} ${prefs.budget.currency ?? "EUR"} total` : "no fixed budget"}`,
    );
    if (prefs.lifestyle?.length) lines.push(`Lifestyle: ${prefs.lifestyle.join(", ")}`);
    if (prefs.vibe) lines.push(`Desired feel: ${prefs.vibe.replace(/_/g, " ")}`);
  }
  if (prefs.notes) lines.push(`Extra notes from the user: ${prefs.notes}`);
  return lines.join("\n");
}

// Creates the furnishing plan: the single source of truth for every image in the
// project. Budgets are computed here (not by the model) and enforced afterwards.
export async function buildFurnishingPlan(prefs: Preferences, rooms: RoomRow[], photos: PhotoRow[]): Promise<FurnishingPlan> {
  const budgets = splitBudget(prefs, rooms);
  const roomDescriptions = rooms
    .map((r) => {
      const ph = photos.filter((p) => p.room_id === r.id);
      const det = ph[0]?.detected ?? {};
      return `- room_id "${r.id}" | ${r.label ?? ROOM_LABELS[r.type]} (${r.type}) | budget: ${
        budgets[r.id] == null ? "none" : `${budgets[r.id]} ${prefs.budget?.currency ?? "EUR"} (hard cap)`
      } | currently: ${det.is_furnished ? "furnished" : "empty"}, floor ${det.floor_guess ?? "unknown"}, walls ${
        det.wall_guess ?? "unknown"
      }, light ${det.light ?? "unknown"}. ${det.notes ?? ""}`;
    })
    .join("\n");

  const plan = await generateJson<FurnishingPlan>({
    system: `You are a senior interior designer creating ONE coherent furnishing plan for a whole home. The plan will be used verbatim to render photorealistic images of every room, so it must be concrete, consistent and within budget. Prices are realistic retail estimates in the user's currency for the given shopping tier. When the tier is IKEA-first, use typical IKEA product categories, shapes and price levels (do not invent product names). Never exceed a room's budget cap; leave headroom of ~5%. Fewer, better pieces beat clutter.`,
    user: `USER PREFERENCES
${describePreferences(prefs)}

ROOMS
${roomDescriptions}

Return JSON exactly in this shape:
{
  "style_guide": {
    "summary": "3-5 sentences describing the look so that every room feels like the same home",
    "materials": ["..."],
    "palette": [{"name": "...", "hex": "#RRGGBB"}],
    "forms": "one sentence on shapes/silhouettes (e.g. rounded, low, slim legs)",
    "lighting": "one sentence on lighting approach",
    "avoid": ["things that would break the style"]
  },
  "rooms": [
    {
      "room_id": "<exactly the room_id given above>",
      "room_type": "<type>",
      "label": "<label>",
      "budget": <number or null>,
      "walls": "concrete description of wall treatment for this room (color name + hex if painted, or 'unchanged')",
      "floor": "concrete description of the floor (or 'unchanged')",
      "layout_notes": "where the main pieces go relative to windows/doors",
      "items": [{"item": "3-seat sofa, light grey woven fabric, slim oak legs", "style_note": "...", "est_price": 599}],
      "total": <sum of est_price>
    }
  ],
  "total_estimate": <sum of all room totals>
}
${prefs.furnish ? "" : "The user does NOT want furniture changes: keep items arrays empty and focus on walls/floor descriptions."}`,
    temperature: 0.5,
  });

  return enforceBudgets(plan, budgets, rooms);
}

// Deterministic guard: trims the cheapest-impact items from the end of each
// room list until the room is within its cap, then fixes totals.
function enforceBudgets(plan: FurnishingPlan, budgets: Record<string, number | null>, rooms: RoomRow[]): FurnishingPlan {
  const byId = new Map(rooms.map((r) => [r.id, r]));
  const fixedRooms: RoomPlan[] = [];
  for (const room of plan.rooms ?? []) {
    const r = byId.get(room.room_id);
    if (!r) continue;
    const cap = budgets[r.id];
    let items = (room.items ?? []).map((it) => ({ ...it, est_price: Math.max(0, Math.round(Number(it.est_price) || 0)) }));
    if (cap != null) {
      let total = items.reduce((a, b) => a + b.est_price, 0);
      while (total > cap && items.length > 1) {
        // drop the least essential (last) item first
        items = items.slice(0, -1);
        total = items.reduce((a, b) => a + b.est_price, 0);
      }
      if (total > cap && items.length === 1) items[0].est_price = cap;
    }
    fixedRooms.push({
      ...room,
      room_type: r.type,
      label: room.label ?? r.label ?? ROOM_LABELS[r.type],
      budget: cap,
      items,
      total: items.reduce((a, b) => a + b.est_price, 0),
    });
  }
  // rooms the model forgot get an empty plan so prompts still work
  for (const r of rooms) {
    if (!fixedRooms.some((x) => x.room_id === r.id)) {
      fixedRooms.push({
        room_id: r.id,
        room_type: r.type,
        label: r.label ?? ROOM_LABELS[r.type],
        budget: budgets[r.id],
        walls: "unchanged",
        floor: "unchanged",
        layout_notes: "",
        items: [],
        total: 0,
      });
    }
  }
  return {
    style_guide: plan.style_guide,
    rooms: fixedRooms,
    total_estimate: fixedRooms.reduce((a, b) => a + b.total, 0),
  };
}
