import "server-only";
import { headers } from "next/headers";

// Base URL of the request the user is on (inredia.com, inredia.vercel.app,
// localhost …) so OAuth always returns to the same host and its cookies.
// Falls back to env / Vercel values when there is no request (background jobs).
export async function getBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // no request scope
  }
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment}`;
  return "http://localhost:3000";
}
