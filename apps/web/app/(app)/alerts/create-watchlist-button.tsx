"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CreateWatchlistButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          isShared: true,
          name: `${projectName} watchlist`,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; watchlistId?: string }
        | null;

      if (!response.ok || !body?.watchlistId) {
        setMessage(body?.error ?? "Could not create watchlist.");
        return;
      }

      await fetch("/api/usage-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "watchlist_create",
          surface: "alerts",
          targetType: "watchlist",
          targetId: body.watchlistId,
          metadata: { projectId, projectName },
        }),
        keepalive: true,
      }).catch(() => null);

      router.push(`/watchlists/${body.watchlistId}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className="gcir-btn-primary"
      >
        {pending ? "Saving..." : "Save watchlist"}
      </button>
      {message && <div className="text-[11.5px] text-warn">{message}</div>}
    </div>
  );
}
