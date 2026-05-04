"use client";

import { useState, useTransition } from "react";

type QladResult = {
  signalsConsidered: number;
  clustersBuilt: number;
  clustersTriggered: number;
  alertsCreated: number;
  alertsSilenced: number;
  totalValidationUsd: number;
};

type CandidatePromotionResult = {
  promotedCount: number;
  promoted?: Array<{
    family: string;
    label: string;
    projectId: string;
  }>;
};

export function RecoveryActions({
  showQladRecovery,
}: {
  showQladRecovery: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"qlad" | "brief" | "candidates" | null>(null);
  const [isPending, startTransition] = useTransition();

  function runQlad() {
    setMessage(null);
    setPendingAction("qlad");
    startTransition(async () => {
      try {
        const response = await fetch("/api/cron/qlad", { method: "POST" });
        const body = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; result?: QladResult }
          | null;

        if (!response.ok || !body?.ok || !body.result) {
          setMessage(body?.error ?? "QLAD recovery run failed.");
          return;
        }

        const result = body.result;
        setMessage(
          `QLAD tick complete. ${result.signalsConsidered} signals reviewed, ${result.clustersTriggered} clusters triggered, ${result.alertsCreated} alerts created, ${result.alertsSilenced} silenced.`,
        );
      } catch {
        setMessage("QLAD recovery run failed.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function generateBrief() {
    setMessage(null);
    setPendingAction("brief");
    startTransition(async () => {
      try {
        const response = await fetch("/api/briefs/generate", { method: "POST" });
        const body = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string; issueNumber?: number; reused?: boolean }
          | null;

        if (!response.ok || !body?.ok) {
          setMessage(body?.error ?? "Brief generation failed.");
          return;
        }

        setMessage(
          body.reused
            ? `Brief issue ${body.issueNumber ?? "current"} already existed for this window.`
            : `Brief issue ${body.issueNumber ?? "new"} generated successfully.`,
        );
      } catch {
        setMessage("Brief generation failed.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  function promoteCandidates() {
    setMessage(null);
    setPendingAction("candidates");
    startTransition(async () => {
      try {
        const response = await fetch("/api/candidates/promote-top", { method: "POST" });
        const body = (await response.json().catch(() => null)) as
          | { ok?: boolean; error?: string } & CandidatePromotionResult
          | null;

        if (!response.ok || !body?.ok) {
          setMessage(body?.error ?? "Candidate promotion failed.");
          return;
        }

        if ((body.promotedCount ?? 0) === 0) {
          setMessage("No new emerging candidates were promoted in this pass.");
          return;
        }

        setMessage(
          `Promoted ${body.promotedCount} emerging candidates into tracked projects.`,
        );
      } catch {
        setMessage("Candidate promotion failed.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <section className="mt-10 rounded-md border border-line bg-bg-2 px-4 py-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        Operator recovery actions
      </div>
      <div className="mb-3 text-[13px] leading-snug text-muted">
        Use these when the pipeline has raw evidence but no investor-facing objects yet. They are
        for recovering stalled formation or brief output, not for routine browsing.
      </div>
      <div className="flex flex-wrap gap-2">
        {showQladRecovery && (
          <button
            type="button"
            onClick={runQlad}
            disabled={isPending}
            className="gcir-btn-primary"
          >
            {pendingAction === "qlad" ? "Running QLAD..." : "Run QLAD recovery"}
          </button>
        )}
        <button
          type="button"
          onClick={promoteCandidates}
          disabled={isPending}
          className="gcir-btn"
        >
          {pendingAction === "candidates" ? "Promoting candidates..." : "Promote top candidates"}
        </button>
        <button
          type="button"
          onClick={generateBrief}
          disabled={isPending}
          className="gcir-btn"
        >
          {pendingAction === "brief" ? "Generating brief..." : "Generate current brief"}
        </button>
      </div>
      {message && <div className="mt-3 text-[12px] text-muted">{message}</div>}
    </section>
  );
}
