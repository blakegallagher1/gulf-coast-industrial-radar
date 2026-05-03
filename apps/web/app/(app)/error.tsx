"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <h2 className="mb-2 text-[16px] font-semibold text-ink">Something went wrong</h2>
      <p className="mb-4 text-[13px] text-muted">
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="gcir-btn">
        Try again
      </button>
    </div>
  );
}
