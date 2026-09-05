import "server-only";
import { generateJson, type InlineImage } from "./gemini";
import { ROOM_TYPES, type PhotoDetected } from "@/lib/types";

// Looks at one uploaded photo and returns what the onboarding needs to know.
export async function classifyPhoto(image: InlineImage): Promise<PhotoDetected> {
  const out = await generateJson<PhotoDetected>({
    system:
      "You are an interior-design assistant. Look at the photo of a room and answer strictly as JSON. Be concise and factual.",
    user: `Return JSON with these keys:
- is_interior: boolean (true only if this is a photo of the inside of a room in a home or flat; false for outdoors, gardens, facades, people, documents, screenshots, etc.)
- room_type: one of ${ROOM_TYPES.join(", ")} (your best guess for what this room is or would be used for)
- is_furnished: boolean (true if there is substantial furniture, false if empty or only boxes/clutter)
- floor_guess: short description of the current floor (e.g. "light laminate", "grey tiles", "old parquet")
- wall_guess: short description of the walls (e.g. "white plaster", "beige with wallpaper")
- light: short description of natural light and window position (e.g. "large window on the left, daylight")
- notes: one sentence about notable architecture (sloped ceiling, radiator, doors, built-ins) that must be preserved`,
    images: [image],
    temperature: 0.2,
  });
  const roomType = ROOM_TYPES.includes(out.room_type as never) ? out.room_type : "other";
  return { ...out, room_type: roomType };
}
