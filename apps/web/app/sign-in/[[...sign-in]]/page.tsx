import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-2 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white">
            ●
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Gulf Coast Industrial Radar
          </h1>
          <p className="mt-1 text-sm text-muted">Private beta · sign in to continue</p>
        </div>
        <SignIn />
      </div>
    </main>
  );
}
