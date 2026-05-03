"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PromoteTopCandidatesButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function promoteTop() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/candidates/promote-top", {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; promotedCount?: number }
        | null;

      if (!response.ok || !body?.ok) {
        setMessage(body?.error ?? "Could not promote top candidates.");
        return;
      }

      await fetch("/api/usage-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "candidate_promote_batch",
          surface: "alerts",
          targetType: "candidate_queue",
          metadata: { promotedCount: body.promotedCount ?? 0 },
        }),
        keepalive: true,
      }).catch(() => null);

      setMessage(
        (body.promotedCount ?? 0) > 0
          ? `Promoted ${body.promotedCount} top candidates.`
          : "No new emerging candidates were promoted in this pass.",
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={promoteTop} disabled={pending} className="gcir-btn">
        {pending ? "Promoting top candidates..." : "Promote top candidates"}
      </button>
      {message && <div className="text-[11.5px] text-muted">{message}</div>}
    </div>
  );
}
