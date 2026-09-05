import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; auth_error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-11 w-11 rounded-xl bg-primary text-primary-foreground grid place-items-center font-semibold text-lg">
            i
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to inredia</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to see your rooms furnished.</p>
        </div>
        <LoginForm next={params.next} authError={Boolean(params.auth_error)} googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1"} appleEnabled={process.env.NEXT_PUBLIC_APPLE_AUTH === "1"} />
      </div>
    </main>
  );
}
