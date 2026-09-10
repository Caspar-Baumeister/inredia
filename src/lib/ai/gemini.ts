import "server-only";
import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

export function gemini() {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

export const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
// Image model per plan: paid Pro users get the stronger (slower, pricier) model,
// everyone else the fast one. Set GEMINI_IMAGE_MODEL_PRO to enable the upgrade.
export const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
export const IMAGE_MODEL_PRO = process.env.GEMINI_IMAGE_MODEL_PRO || IMAGE_MODEL;
// The structure check only answers yes/no — a cheaper/faster model is fine here.
export const VERIFY_MODEL = process.env.GEMINI_VERIFY_MODEL || TEXT_MODEL;

export function imageModelForPlan(plan: string): string {
  return plan === "pro" ? IMAGE_MODEL_PRO : IMAGE_MODEL;
}

export type InlineImage = { mimeType: string; data: string }; // base64

// Small helper: ask the text model for JSON and parse it. Retries once on parse failure.
export async function generateJson<T>(opts: {
  system: string;
  user: string;
  images?: InlineImage[];
  temperature?: number;
  model?: string;
}): Promise<T> {
  const parts: Array<{ text: string } | { inlineData: InlineImage }> = [];
  for (const img of opts.images ?? []) parts.push({ inlineData: img });
  parts.push({ text: opts.user });

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await gemini().models.generateContent({
      model: opts.model ?? TEXT_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        temperature: opts.temperature ?? 0.4,
      },
    });
    const text = res.text ?? "";
    try {
      return JSON.parse(stripFences(text)) as T;
    } catch (e) {
      if (attempt === 1) throw new Error(`Model returned invalid JSON: ${text.slice(0, 200)} (${(e as Error).message})`);
    }
  }
  throw new Error("unreachable");
}

function stripFences(s: string) {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");
}

export async function fetchAsInline(url: string): Promise<InlineImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status})`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buf.toString("base64") };
}
