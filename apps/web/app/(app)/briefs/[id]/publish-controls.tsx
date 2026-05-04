"use client";

import { useState, useTransition } from "react";

export function PublishControls({
  briefId,
  initialPublished,
}: {
  briefId: string;
  initialPublished: boolean;
}) {
  const [emails, setEmails] = useState("");
  const [published, setPublished] = useState(initialPublished);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setMessage(null);
    const parsedEmails = emails
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);

    startTransition(async () => {
      const response = await fetch(`/api/briefs/${briefId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: parsedEmails }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; queuedRecipients?: number }
        | null;
      if (!response.ok || !body?.ok) {
        setMessage(body?.error ?? "Publish failed.");
        return;
      }
      setPublished(true);
      await fetch("/api/usage-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "brief_publish",
          surface: "brief",
          targetType: "brief",
          targetId: briefId,
          metadata: {
            queuedRecipients: body.queuedRecipients ?? 0,
          },
        }),
        keepalive: true,
      }).catch(() => null);
      setMessage(
        body.queuedRecipients
          ? `Published. ${body.queuedRecipients} recipients queued.`
          : "Published. No recipients queued yet.",
      );
    });
  }

  return (
    <section className="mb-9 rounded-md border border-line bg-bg-2 px-4 py-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-tight text-ink">
          Publish and queue delivery
        </h2>
        <span className="font-mono text-[11.5px] text-muted">
          {published ? "published" : "draft"}
        </span>
      </div>
      <div className="text-[13px] leading-snug text-muted">
        Queue this issue for manual delivery to a team distribution list. This does not send email by itself; it marks the issue published and stores intended recipients.
      </div>
      <textarea
        value={emails}
        onChange={(event) => setEmails(event.target.value)}
        placeholder="team@gallagherpropco.com, acquisitions@gallagherpropco.com"
        className="mt-3 min-h-[84px] w-full rounded-md border border-line bg-white px-3 py-2 text-[13px] outline-none ring-2 ring-transparent transition focus:ring-accent"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="gcir-btn-primary"
        >
          {pending ? "Publishing..." : "Publish brief"}
        </button>
        <span className="text-[11.5px] text-muted">
          Comma or newline separated emails
        </span>
      </div>
      {message && <div className="mt-3 text-[12px] text-muted">{message}</div>}
    </section>
  );
}
