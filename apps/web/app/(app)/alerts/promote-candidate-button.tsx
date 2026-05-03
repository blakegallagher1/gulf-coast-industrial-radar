"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PromoteCandidateButton({
  family,
  label,
  summary,
}: {
  family: string;
  label: string;
  summary: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function promote() {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/candidates/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ family, label, summary }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; projectId?: string }
        | null;

      if (!response.ok || !body?.projectId) {
        setMessage(body?.error ?? "Could not promote candidate.");
        return;
      }

      await fetch("/api/usage-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "candidate_promote",
          surface: "alerts",
          targetType: "project",
          targetId: body.projectId,
          metadata: { family, label },
        }),
        keepalive: true,
      }).catch(() => null);

      router.push(`/radar?projectId=${encodeURIComponent(body.projectId)}&focus=actions`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" onClick={promote} disabled={pending} className="gcir-btn">
        {pending ? "Promoting..." : "Promote to tracked project"}
      </button>
      {message && <div className="text-[11.5px] text-warn">{message}</div>}
    </div>
  );
}
