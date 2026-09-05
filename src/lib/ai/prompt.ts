import type { FurnishingPlan, PhotoDetected, Preferences, RoomPlan } from "@/lib/types";

// Controlled variation between the cards of one stack. Style never varies —
// only these axes — so every card stays true to the plan.
export const VARIATIONS: Array<Record<string, string>> = [
  {
    id: "A",
    layout: "main seating (or bed) pushed against the longest solid wall, facing into the room; coffee table and rug centred; nothing in front of the windows",
    accent: "muted, tone-on-tone",
    decor: "sparse — one plant, one framed print",
    textiles: "linen, cream and oatmeal",
  },
  {
    id: "B",
    layout: "main seating floating in the middle of the room, turned to face the window wall; a slim console or shelf behind it; armchair placed beside the window",
    accent: "one clear accent color from the palette on cushions and a single chair",
    decor: "balanced — plant, two prints, a table lamp",
    textiles: "wool, soft grey with a colored throw",
  },
  {
    id: "C",
    layout: "L-shaped corner arrangement in the corner farthest from the door; a floor lamp behind the corner; reading spot near the window; rug turned 90 degrees",
    accent: "warm caramel / cognac details (leather or wood)",
    decor: "layered — several plants, stacked books, textured cushions",
    textiles: "bouclé and knitted throws",
  },
  {
    id: "D",
    layout: "symmetric arrangement: two matching seating pieces facing each other across the coffee table, centred on the focal wall; pendant light above",
    accent: "black and white contrast",
    decor: "gallery wall of 3-5 frames, minimal on surfaces",
    textiles: "crisp cotton, monochrome",
  },
  {
    id: "E",
    layout: "compact: all furniture pulled to the back wall, large open floor area, oversized rug, one sculptural statement lamp",
    accent: "a single dark green or navy piece",
    decor: "minimal — one large plant only",
    textiles: "velvet on one piece, otherwise plain",
  },
];

export function pickVariation(index: number) {
  return VARIATIONS[index % VARIATIONS.length];
}

const QUALITY = `PHOTOGRAPHY: This must look like a real photograph taken by a professional interior photographer for a premium furniture catalogue or an architecture magazine. Natural daylight consistent with the window position in the original, soft shadows, realistic materials and reflections, correct scale of furniture relative to the room, straight verticals, 24-35mm full-frame look, subtle depth of field. No text, no watermark, no logos, no people, no pets, no floating or clipped objects, no distortion of walls, no cartoonish or CGI look, no oversaturation.`;

const STRUCTURE_RULE = `RULE #1 — ABSOLUTE, OVERRIDES EVERYTHING ELSE: The architecture of the room is fixed. Keep EXACTLY the same walls, wall positions and angles, ceiling, floor plan, windows (same number, size, position and view outside), doors and door openings, radiators, pipes, sockets, built-in shelves and niches, and the same camera position, lens and perspective as in the original photo. NEVER add a window, door, wall, arch, column, beam, skylight, fireplace, staircase or any other structural element that is not in the original. NEVER remove or move one. NEVER change the room's size or proportions. If a furniture arrangement would require changing the architecture, change the furniture arrangement instead. The output must be the same room from the same viewpoint — only its surfaces, furniture and decor may differ.`;

export function buildGenerationPrompt(opts: {
  plan: FurnishingPlan;
  roomPlan: RoomPlan;
  prefs: Preferences;
  detected: PhotoDetected;
  variation: Record<string, string>;
  avoidRules: string[];
  hasStyleRefs: boolean;
}): string {
  const { plan, roomPlan, prefs, detected, variation, avoidRules, hasStyleRefs } = opts;
  const sg = plan.style_guide;
  const furnish = prefs.furnish && roomPlan.items.length > 0;

  const keep = detected.is_furnished
    ? "REMOVE all existing furniture and loose objects first, then furnish from scratch as described."
    : "The room is empty (or nearly empty); remove any leftover boxes or clutter and furnish it as described.";

  const items = roomPlan.items.map((it) => `• ${it.item}${it.style_note ? ` (${it.style_note})` : ""}`).join("\n");

  return [
    STRUCTURE_RULE,
    `TASK: Edit the attached photo of a ${roomPlan.label.toLowerCase()} into a finished, professionally styled interior. Output one photorealistic image with the same framing as the input.`,
    keep,
    `WALLS: ${roomPlan.walls}`,
    `FLOOR: ${roomPlan.floor}`,
    furnish
      ? `FURNITURE — use exactly these pieces and nothing else that is not implied by them (this list is fixed for budget reasons):\n${items}`
      : `FURNITURE: do not add furniture. Only the wall and floor changes.`,
    furnish
      ? `ARRANGEMENT (variation ${variation.id ?? "A"} — this must look clearly different from other arrangements of the same room, so follow it literally): ${variation.layout}. Accent: ${variation.accent}. Decor: ${variation.decor}. Textiles: ${variation.textiles ?? "neutral"}. General notes for this room: ${roomPlan.layout_notes}.`
      : "",
    `STYLE GUIDE (identical in every room of this home): ${sg.summary} Materials: ${sg.materials.join(", ")}. Palette: ${sg.palette
      .map((p) => `${p.name} ${p.hex}`)
      .join(", ")}. Forms: ${sg.forms} Lighting: ${sg.lighting}`,
    hasStyleRefs
      ? `STYLE REFERENCES: the additional attached images are rooms from the same home that the user already approved. Match their materials, colors and mood closely so all rooms feel like one home.`
      : "",
    (sg.avoid?.length || avoidRules.length) ? `AVOID: ${[...sg.avoid, ...avoidRules].join("; ")}.` : "",
    QUALITY,
    `FINAL CHECK before output: same walls, same windows, same doors, same camera as the original. No added architecture.`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildEditPrompt(instruction: string, plan: FurnishingPlan): string {
  return [
    STRUCTURE_RULE,
    `TASK: Apply this change to the attached interior photo: "${instruction}".`,
    `Change only what the instruction asks for. Keep everything else — geometry, camera, furniture not mentioned, lighting — identical to the input.`,
    `Stay within the home's style guide: ${plan.style_guide.summary}`,
    QUALITY,
  ].join("\n\n");
}
