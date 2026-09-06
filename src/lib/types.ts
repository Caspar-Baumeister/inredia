// Shared domain types. Kept deliberately small and JSON-friendly because
// `preferences` and `plan` live in jsonb columns.

export const ROOM_TYPES = [
  "living_room",
  "bedroom",
  "kitchen",
  "dining",
  "bathroom",
  "office",
  "kids_room",
  "hallway",
  "other",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_LABELS: Record<RoomType, string> = {
  living_room: "Living room",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  dining: "Dining room",
  bathroom: "Bathroom",
  office: "Office",
  kids_room: "Kids room",
  hallway: "Hallway",
  other: "Other",
};

// Relative weight used when the budget is split automatically.
export const ROOM_BUDGET_WEIGHT: Record<RoomType, number> = {
  living_room: 5,
  bedroom: 3,
  kitchen: 2,
  dining: 3,
  bathroom: 1,
  office: 2,
  kids_room: 2,
  hallway: 1,
  other: 1,
};

export const STYLES = [
  { id: "scandinavian", label: "Scandinavian", blurb: "Light wood, white, soft textiles" },
  { id: "japandi", label: "Japandi", blurb: "Calm, low, natural, uncluttered" },
  { id: "mid_century", label: "Mid-century", blurb: "Walnut, tapered legs, retro shapes" },
  { id: "minimal", label: "Minimal", blurb: "Few pieces, clean lines, quiet colors" },
  { id: "industrial", label: "Industrial", blurb: "Black metal, leather, raw materials" },
  { id: "boho", label: "Boho", blurb: "Rattan, plants, layered textures" },
  { id: "classic", label: "Classic", blurb: "Elegant, symmetrical, timeless" },
  { id: "surprise", label: "Surprise me", blurb: "Let the app pick what suits the space" },
] as const;
export type StyleId = (typeof STYLES)[number]["id"];

export const SHOP_TIERS = [
  { id: "ikea_first", label: "IKEA-first", blurb: "Affordable, recognisable IKEA look" },
  { id: "mixed", label: "Mixed", blurb: "IKEA basics + a few mid-range pieces" },
  { id: "high_end", label: "High-end", blurb: "Designer pieces, premium materials" },
  { id: "second_hand", label: "Second-hand friendly", blurb: "Vintage finds, character pieces" },
] as const;
export type ShopTier = (typeof SHOP_TIERS)[number]["id"];

export const WALL_PALETTES = [
  { id: "warm_whites", label: "Warm whites", swatches: ["#F6F1E7", "#EFE7D8", "#F9F5EE"] },
  { id: "cool_greys", label: "Cool greys", swatches: ["#E5E7EA", "#CFD3D8", "#F2F3F5"] },
  { id: "earthy", label: "Earthy tones", swatches: ["#C9A98A", "#A78A6E", "#E3D3C0"] },
  { id: "accent_wall", label: "Bold accent wall", swatches: ["#2F4F4F", "#8C3B3B", "#264653"] },
  { id: "dark_moody", label: "Dark & moody", swatches: ["#2B2D31", "#1F2A30", "#3A2E2E"] },
] as const;
export type WallPalette = (typeof WALL_PALETTES)[number]["id"];

export const FLOOR_MATERIALS = [
  { id: "light_wood", label: "Light wood", hasTone: false },
  { id: "dark_wood", label: "Dark wood", hasTone: false },
  { id: "herringbone", label: "Herringbone parquet", hasTone: true },
  { id: "tiles", label: "Tiles", hasTone: false },
  { id: "concrete", label: "Polished concrete", hasTone: false },
  { id: "carpet", label: "Carpet", hasTone: false },
  { id: "vinyl", label: "Vinyl", hasTone: false },
] as const;
export type FloorMaterial = (typeof FLOOR_MATERIALS)[number]["id"];

export const LIFESTYLE = [
  { id: "kids", label: "Kids" },
  { id: "pets", label: "Pets" },
  { id: "home_office", label: "Home office" },
  { id: "hosting", label: "Frequent guests" },
  { id: "storage", label: "Small space, need storage" },
] as const;

export const VIBES = [
  { id: "calm_cozy", label: "Calm & cozy" },
  { id: "bright_airy", label: "Bright & airy" },
  { id: "warm_lived_in", label: "Warm & lived-in" },
  { id: "clean_modern", label: "Clean & modern" },
  { id: "playful", label: "Playful & colorful" },
] as const;

export type Preferences = {
  // Walls are never changed by inredia; kept as an optional field for old rows.
  walls?: { mode: "keep" | "refresh" | "change" | "auto"; palette?: WallPalette };
  floor?: { mode: "keep" | "change" | "auto"; material?: FloorMaterial; tone?: "light" | "medium" | "dark" };
  furnish?: boolean;
  // What to do with furniture that is already in the photos.
  existing_furniture?: "replace" | "keep";
  style?: StyleId;
  shop_tier?: ShopTier;
  budget?: { total: number | null; currency: string; split: "auto" | "manual"; per_room?: Record<string, number> };
  lifestyle?: string[];
  vibe?: string;
  notes?: string;
};

export type PlanItem = { item: string; style_note: string; est_price: number };
export type RoomPlan = {
  room_id: string;
  room_type: RoomType;
  label: string;
  budget: number | null;
  walls: string;
  floor: string;
  layout_notes: string;
  items: PlanItem[];
  total: number;
};
export type FurnishingPlan = {
  style_guide: {
    summary: string;
    materials: string[];
    palette: { name: string; hex: string }[];
    forms: string;
    lighting: string;
    avoid: string[];
  };
  rooms: RoomPlan[];
  total_estimate: number;
};

export type PhotoDetected = {
  is_interior?: boolean;
  room_type?: RoomType;
  is_furnished?: boolean;
  floor_guess?: string;
  wall_guess?: string;
  light?: string;
  architecture?: string; // inventory of windows/doors/etc. used for prompts + verification
  notes?: string;
};

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  preferences: Preferences;
  plan: FurnishingPlan | null;
  plan_version: number;
  plan_status: "none" | "building" | "ready" | "failed";
  onboarding_done: boolean;
  created_at: string;
};

export type RoomRow = {
  id: string;
  project_id: string;
  type: RoomType;
  label: string | null;
  budget_share: number | null;
  sort_order: number;
};

export type PhotoRow = {
  id: string;
  project_id: string;
  room_id: string | null;
  storage_path: string;
  width: number | null;
  height: number | null;
  detected: PhotoDetected;
  sort_order: number;
};

export type GenerationRow = {
  id: string;
  project_id: string;
  photo_id: string;
  plan_version: number;
  kind: "variant" | "edit";
  parent_generation_id: string | null;
  variation: Record<string, string>;
  prompt: string | null;
  edit_instruction: string | null;
  storage_path: string | null;
  status: "queued" | "generating" | "ready" | "failed";
  error: string | null;
  created_at: string;
};

// What the dashboard client receives for one card.
export type StackCard = {
  id: string;
  status: GenerationRow["status"];
  url: string | null;
  kind: GenerationRow["kind"];
  variation: Record<string, string>;
  createdAt: string;
};

export type PreferencesDiff = {
  summary: string[]; // human readable lines, e.g. "Floor: light wood → herringbone oak"
  preferences: Preferences; // full merged preferences after the change
  avoid_rules_add?: string[];
  avoid_rules_remove?: string[]; // ids
  requires_regeneration: boolean;
};
