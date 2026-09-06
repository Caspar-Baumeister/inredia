import "server-only";
import { generateJson, type InlineImage } from "./gemini";
import type { PhotoDetected } from "@/lib/types";

export type StructureVerdict = {
  ok: boolean;
  problems: string[]; // short, concrete, e.g. "second window added on the left wall"
  confidence: number; // 0..1
};

// Compares the generated image against the original and reports any change of
// fixed architecture (and of the floor/walls when they are meant to be kept).
// This is the safety net behind the prompt rules: an image that fails here is
// regenerated instead of shown.
export async function verifyStructure(opts: {
  original: InlineImage;
  generated: InlineImage;
  detected: PhotoDetected;
  keepFloor: boolean;
  keepWalls: boolean;
}): Promise<StructureVerdict> {
  const { original, generated, detected, keepFloor, keepWalls } = opts;
  const checks = [
    "windows: same number, same wall, same position and size (a window may be partly hidden by furniture or curtains — that is fine)",
    "doors and door openings: same number, position and state",
    "walls, wall corners, ceiling, radiators, built-ins: same",
    "camera viewpoint and perspective: same room seen from the same spot",
    keepFloor
      ? `floor: MUST be the identical floor as in the original (${detected.floor_guess ?? "see image 1"}): same material, color, plank/tile width and direction. A different but similar floor is a failure. Rugs on top are fine.`
      : "floor: material may differ (intended), but its extent and perspective must match",
    keepWalls
      ? `walls: same color/finish as in the original (${detected.wall_guess ?? "see image 1"}); decor hung on them is fine`
      : "walls: color may differ (intended)",
  ];
  const out = await generateJson<StructureVerdict>({
    system:
      "You are a meticulous QA inspector for an interior-visualisation product. Image 1 is the original photo of an empty room, image 2 is an AI-generated furnished version. Furniture, decor, textiles and lighting are allowed to differ. Your only job is to detect changes to the fixed architecture and to protected surfaces. Be strict about the checklist, but do not flag things that are merely hidden behind furniture. Answer strictly as JSON.",
    user: `Original inventory (from image 1): ${detected.architecture ?? "n/a"}. ${detected.notes ?? ""}

Checklist:
${checks.map((c) => `- ${c}`).join("\n")}

Return JSON: { "ok": boolean, "problems": string[] (each a short concrete sentence; empty if ok), "confidence": number 0..1 }. Set ok=false only for a real violation of the checklist.`,
    images: [original, generated],
    temperature: 0.1,
  });
  return {
    ok: Boolean(out.ok),
    problems: Array.isArray(out.problems) ? out.problems.map(String).slice(0, 5) : [],
    confidence: typeof out.confidence === "number" ? out.confidence : 0.5,
  };
}
