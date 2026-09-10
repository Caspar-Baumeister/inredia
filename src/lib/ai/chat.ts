import "server-only";
import { generateJson } from "./gemini";
import { describePreferences } from "./plan";
import { FLOOR_MATERIALS, SHOP_TIERS, STYLES, type Preferences, type PreferencesDiff } from "@/lib/types";

// Turns a free-text chat message into a preferences diff. The model returns
// the full merged preferences so the server never has to guess at merge rules.
export async function preferencesDiffFromChat(opts: {
  message: string;
  prefs: Preferences;
  avoidRules: { id: string; text: string }[];
  roomList: { id: string; label: string }[];
}): Promise<PreferencesDiff> {
  const { message, prefs, avoidRules, roomList } = opts;
  const diff = await generateJson<PreferencesDiff>({
    system: `You update a home-furnishing preferences object from a user's chat message. Only change what the user asked for. Be conservative and literal. Walls can NEVER be changed or repainted in this product: if the user asks for a wall change, do not change anything for it and add a summary line "Walls: cannot be changed". Output JSON only.`,
    user: `CURRENT PREFERENCES (JSON): ${JSON.stringify(prefs)}
CURRENT PREFERENCES (readable):
${describePreferences(prefs)}

ACTIVE AVOID RULES: ${avoidRules.length ? avoidRules.map((r) => `[${r.id}] ${r.text}`).join("; ") : "none"}
ROOMS: ${roomList.map((r) => `${r.label} (${r.id})`).join(", ")}

ALLOWED VALUES
- style: ${STYLES.map((s) => s.id).join(", ")}
- shop_tier: ${SHOP_TIERS.map((s) => s.id).join(", ")}
- floor.mode: keep | change | auto ; floor.material: ${FLOOR_MATERIALS.map((f) => f.id).join(", ")} ; floor.tone: light | medium | dark
- existing_furniture: replace | curate | keep (furniture already in the photos: replace everything / keep only what fits the style / keep all of it)
- budget: { total: number|null, currency: string, split: "auto"|"manual", per_room?: {room_id: number} }
- lifestyle: array of kids, pets, home_office, hosting, storage
- vibe: calm_cozy | bright_airy | warm_lived_in | clean_modern | playful
- notes: free text for anything that has no field (append, don't overwrite unrelated notes)
- (walls: not allowed — never add or change a walls field)

USER MESSAGE: """${message}"""

Return JSON:
{
  "summary": ["one short line per change, format 'Field: old → new'"],
  "preferences": <the complete merged preferences object>,
  "avoid_rules_add": ["new avoid rules the user asked for, as short phrases"],
  "avoid_rules_remove": ["ids of avoid rules the user wants removed"],
  "requires_regeneration": true if any change affects how images look, false if nothing changed
}`,
    temperature: 0.1,
  });
  // Hard guarantee, whatever the model returns.
  if (diff.preferences) delete diff.preferences.walls;
  return diff;
}
