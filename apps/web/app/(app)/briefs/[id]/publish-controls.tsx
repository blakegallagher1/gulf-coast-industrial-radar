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
        | {
            ok?: boolean;
            error?: string;
            queuedRecipients?: number;
            followedWatchlistRecipients?: number;
          }
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
          ? `Published. ${body.queuedRecipients} recipients queued (${body.followedWatchlistRecipients ?? 0} from followed watchlists).`
          : "Published. No recipients queued yet.",
      );
    });
  }

  return (
    <section className="mb-10 overflow-hidden rounded-[7px] border border-line bg-bone shadow-sm">
      <div className="border-b border-line bg-bone-2/60 px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-ink">
              Publish &amp; queue delivery
            </div>
            <h2 className="mt-1 font-display text-[20px] leading-tight tracking-tight text-ink">
              Distribution
            </h2>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${published ? "border-info/30 bg-info/10 text-info" : "border-line bg-bone-2 text-muted"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-info" : "bg-muted-2"}`} />
            {published ? "published" : "draft"}
          </span>
        </div>
      </div>

      <div className="px-5 py-4">
        <div className="text-[13px] leading-[1.6] text-muted">
          Queue this issue for manual delivery to a team distribution list. This does not send email by itself —
          it marks the issue published and stores intended recipients.
        </div>
        <textarea
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          placeholder="team@gallagherpropco.com, acquisitions@gallagherpropco.com"
          className="mt-3.5 min-h-[88px] w-full rounded-[5px] border border-line bg-bone-2/60 px-3.5 py-2.5 font-mono text-[13px] text-ink outline-none ring-2 ring-transparent transition focus:border-accent/50 focus:ring-accent/20"
        />
        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={submit} disabled={pending} className="gcir-btn-accent">
            {pending ? "Publishing…" : "Publish brief"}
          </button>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
            Comma or newline separated · stored in BriefRecipient
          </span>
        </div>
        {message && (
          <div className="mt-3.5 rounded-[5px] border border-line bg-bone-2/60 px-3.5 py-2.5 font-mono text-[11.5px] text-ink-3">
            <span className="mr-2 text-accent-ink">→</span>{message}
          </div>
        )}
      </div>
    </section>
  );
}
