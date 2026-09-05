"use client";

import { useActionState } from "react";
import { magicLinkAction, signInWithAppleAction, signInWithGoogleAction, type AuthState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ next, authError, googleEnabled, appleEnabled }: { next?: string; authError: boolean; googleEnabled: boolean; appleEnabled: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(magicLinkAction, undefined);

  if (state?.sent) {
    return (
      <div className="rounded-xl bg-card p-6 card-shadow text-center">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-sm text-muted-foreground">We sent you a sign-in link. It expires in a few minutes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card p-6 card-shadow space-y-4">
      {authError && <p className="text-sm text-danger">That link didn&apos;t work. Please try again.</p>}
      {(googleEnabled || appleEnabled) && (
        <>
          {googleEnabled && (
            <form action={signInWithGoogleAction}>
              <input type="hidden" name="next" value={next ?? "/dashboard"} />
              <Button type="submit" variant="outline" className="w-full">
                <GoogleIcon /> Continue with Google
              </Button>
            </form>
          )}
          {appleEnabled && (
            <form action={signInWithAppleAction}>
              <input type="hidden" name="next" value={next ?? "/dashboard"} />
              <Button type="submit" className="w-full bg-black text-white hover:bg-black/90">
                <AppleIcon /> Continue with Apple
              </Button>
            </form>
          )}
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/30"
        />
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
    </div>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 12.79c-.02-2.06 1.68-3.05 1.76-3.1-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.65 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.45 2.51-.37 6.22 1.04 8.25.69 1 1.5 2.12 2.57 2.08 1.03-.04 1.42-.67 2.67-.67s1.6.67 2.69.65c1.11-.02 1.82-1.01 2.5-2.02.79-1.16 1.11-2.28 1.13-2.34-.02-.01-2.17-.83-2.18-3.32zM14.32 6.73c.57-.69.95-1.65.85-2.61-.82.03-1.81.55-2.4 1.24-.53.61-.99 1.59-.87 2.53.91.07 1.85-.47 2.42-1.16z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.709A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.709V4.959H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.041l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.959L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" />
    </svg>
  );
}
