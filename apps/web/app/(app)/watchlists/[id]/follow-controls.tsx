"use client";

import { useState, useTransition } from "react";

export function FollowControls({
  watchlistId,
  initialFollowed,
  initialDeliveryMode,
}: {
  watchlistId: string;
  initialFollowed: boolean;
  initialDeliveryMode: "weekly_brief" | "manual";
}) {
  const [followed, setFollowed] = useState(initialFollowed);
  const [deliveryMode, setDeliveryMode] = useState(initialDeliveryMode);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(nextFollowed: boolean, nextDeliveryMode: "weekly_brief" | "manual") {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/watchlists/${watchlistId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followed: nextFollowed,
          deliveryMode: nextDeliveryMode,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string; followed?: boolean; deliveryMode?: "weekly_brief" | "manual" }
        | null;

      if (!response.ok || !body?.ok) {
        setMessage(body?.error ?? "Update failed.");
        return;
      }

      setFollowed(Boolean(body.followed));
      setDeliveryMode(body.deliveryMode ?? nextDeliveryMode);
      await fetch("/api/usage-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "watchlist_follow_update",
          surface: "watchlist",
          targetType: "watchlist",
          targetId: watchlistId,
          metadata: {
            followed: Boolean(body.followed),
            deliveryMode: body.deliveryMode ?? nextDeliveryMode,
          },
        }),
        keepalive: true,
      }).catch(() => null);
      setMessage(
        body.followed
          ? body.deliveryMode === "weekly_brief"
            ? "Following. This watchlist is marked for weekly brief inclusion."
            : "Following. Delivery is manual."
          : "Watchlist removed from followed workflow.",
      );
    });
  }

  return (
    <section className="mb-6 overflow-hidden rounded-md border border-line">
      <div className="border-b border-line bg-bg-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
        Follow and delivery
      </div>
      <div className="px-4 py-4">
        <div className="mb-3 text-[13px] leading-snug text-muted">
          Followed watchlists are the candidate surfaces that should keep appearing in operating reviews and weekly intelligence output.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => save(!followed, !followed ? deliveryMode : "manual")}
            disabled={pending}
            className={followed ? "gcir-btn-primary" : "gcir-btn"}
          >
            {pending ? "Saving..." : followed ? "Following" : "Follow watchlist"}
          </button>
          <button
            type="button"
            onClick={() => save(true, "weekly_brief")}
            disabled={pending}
            className={deliveryMode === "weekly_brief" && followed ? "gcir-btn-primary" : "gcir-btn"}
          >
            Weekly brief
          </button>
          <button
            type="button"
            onClick={() => save(true, "manual")}
            disabled={pending}
            className={deliveryMode === "manual" && followed ? "gcir-btn-primary" : "gcir-btn"}
          >
            Manual only
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11.5px] text-muted">
          <span className="rounded-full border border-line px-2 py-1 font-mono">
            state · {followed ? "followed" : "not-followed"}
          </span>
          <span className="rounded-full border border-line px-2 py-1 font-mono">
            delivery · {deliveryMode}
          </span>
        </div>
        {message && <div className="mt-3 text-[12px] text-muted">{message}</div>}
      </div>
    </section>
  );
}
