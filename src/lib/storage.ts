import "server-only";
import { getSupabaseAdmin } from "./supabase/admin";

export const ORIGINALS = "originals";
export const GENERATIONS = "generations";

// Signed URLs so private buckets can be shown in the browser (1h).
export async function signedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string | null> {
  const { data } = await getSupabaseAdmin().storage.from(bucket).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

export async function signedUrls(bucket: string, paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await getSupabaseAdmin().storage.from(bucket).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const row of data ?? []) if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  return out;
}

export async function downloadAsBase64(bucket: string, path: string): Promise<{ mimeType: string; data: string }> {
  const { data, error } = await getSupabaseAdmin().storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Download failed for ${bucket}/${path}: ${error?.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  return { mimeType: data.type || "image/jpeg", data: buf.toString("base64") };
}

export async function uploadBuffer(bucket: string, path: string, buf: Buffer, contentType: string) {
  const { error } = await getSupabaseAdmin().storage.from(bucket).upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed for ${bucket}/${path}: ${error.message}`);
}
