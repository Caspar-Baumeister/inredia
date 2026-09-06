"use client";

import { signInWithAppleAction, signInWithGoogleAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ next, authError, appleEnabled }: { next?: string; authError: boolean; appleEnabled: boolean }) {
  return (
    <div className="rounded-xl bg-card p-6 card-shadow space-y-3">
      {authError && <p className="text-sm text-danger">Sign-in didn&apos;t work. Please try again.</p>}
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next ?? "/dashboard"} />
        <Button type="submit" variant="outline" className="w-full">
          <GoogleIcon /> Continue with Google
        </Button>
      </form>
      {appleEnabled && (
        <form action={signInWithAppleAction}>
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <Button type="submit" className="w-full bg-black text-white hover:bg-black/90">
            <AppleIcon /> Continue with Apple
          </Button>
        </form>
      )}
      <p className="pt-1 text-center text-xs text-muted-foreground">Free while in beta. No credit card.</p>
    </div>
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

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.2-1.24 3.04-.9.98-2.1 1.55-3.24 1.45-.14-1.1.34-2.24 1.15-3.05.86-.93 2.23-1.58 3.33-1.44ZM20.9 17.25c-.55 1.27-.81 1.84-1.52 2.96-.99 1.56-2.38 3.5-4.1 3.52-1.53.02-1.93-1-4.01-.99-2.08.01-2.51 1.01-4.05.99-1.72-.02-3.04-1.77-4.03-3.33C.4 16.9-.05 12.3 1.4 9.61c1.03-1.9 2.66-3.03 4.19-3.03 1.56 0 2.54 1.02 3.83 1.02 1.25 0 2.02-1.02 3.83-1.02 1.36 0 2.8.74 3.83 2.02-3.37 1.85-2.82 6.66.82 8.65Z" />
    </svg>
  );
}
