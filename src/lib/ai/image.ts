import "server-only";
import { gemini, IMAGE_MODEL, type InlineImage } from "./gemini";

export type ImageRequest = {
  prompt: string;
  base: InlineImage; // the original photo (or the card being edited)
  refs?: InlineImage[]; // liked images used as style references
  aspectRatio?: string;
};

export type ImageResult = { mimeType: string; data: Buffer };

// Provider abstraction: swap the implementation here to move to another model
// (OpenAI gpt-image, Flux Kontext, ...) without touching the pipeline.
export interface ImageProvider {
  generate(req: ImageRequest): Promise<ImageResult>;
}

export const geminiImageProvider: ImageProvider = {
  async generate(req) {
    const parts: Array<{ text: string } | { inlineData: InlineImage }> = [
      { text: "ORIGINAL PHOTO (edit this one):" },
      { inlineData: req.base },
    ];
    for (const ref of req.refs ?? []) {
      parts.push({ text: "STYLE REFERENCE (approved room from the same home):" }, { inlineData: ref });
    }
    parts.push({ text: req.prompt });

    const res = await gemini().models.generateContent({
      model: IMAGE_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: req.aspectRatio ? { aspectRatio: req.aspectRatio } : undefined,
      },
    });

    const candidate = res.candidates?.[0];
    const imgPart = candidate?.content?.parts?.find((p) => p.inlineData?.data);
    if (!imgPart?.inlineData?.data) {
      const reason = candidate?.finishReason ?? res.promptFeedback?.blockReason ?? "no image in response";
      throw new Error(`Image generation failed: ${reason}`);
    }
    return {
      mimeType: imgPart.inlineData.mimeType || "image/png",
      data: Buffer.from(imgPart.inlineData.data, "base64"),
    };
  },
};

export function aspectRatioFor(width: number | null, height: number | null): string {
  if (!width || !height) return "4:3";
  const r = width / height;
  const options: Array<[string, number]> = [
    ["1:1", 1],
    ["4:3", 4 / 3],
    ["3:4", 3 / 4],
    ["3:2", 1.5],
    ["2:3", 2 / 3],
    ["16:9", 16 / 9],
    ["9:16", 9 / 16],
  ];
  return options.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best))[0];
}
