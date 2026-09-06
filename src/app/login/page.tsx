import { LoginForm } from "./LoginForm";
import { LogoMark } from "@/components/app/Logo";
import { SITE } from "@/lib/site";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; auth_error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <LogoMark size={52} className="mx-auto mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to inredia</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to see your rooms furnished.</p>
        </div>
        <LoginForm next={params.next} authError={Boolean(params.auth_error)} appleEnabled={process.env.NEXT_PUBLIC_APPLE_AUTH === "1"} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Questions or feedback? Message {SITE.founder} on{" "}
          <a href={SITE.xUrl} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
            X {SITE.xHandle}
          </a>
        </p>
      </div>
    </main>
  );
}
