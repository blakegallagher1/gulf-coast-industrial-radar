import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-2 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Request access
          </h1>
          <p className="mt-1 text-sm text-muted">
            Approval is required for the Gulf Coast Industrial Radar private beta.
          </p>
        </div>
        <SignUp />
      </div>
    </main>
  );
}
