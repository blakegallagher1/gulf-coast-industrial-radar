"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function GenerateBriefButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/briefs/generate", { method: "POST" });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? "Brief generation failed.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Generating brief..." : "Generate first brief"}
      </button>
      {error && (
        <p className="max-w-[560px] text-center text-xs leading-5 text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
