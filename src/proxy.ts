import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const APP_PATHS = ["/dashboard", "/library", "/preferences", "/settings", "/onboarding"];

export default async function proxy(req: NextRequest) {
  const { response, user } = await updateSession(req);
  const path = req.nextUrl.pathname;
  const isAppPath = APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (isAppPath && !user) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (path === "/login" && user) return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  return response;
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
