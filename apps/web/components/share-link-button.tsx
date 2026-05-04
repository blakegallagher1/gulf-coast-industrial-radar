"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

export function ShareLinkButton({
  path,
  label = "Copy link",
  surface,
  targetType,
  targetId,
}: {
  path: string;
  label?: string;
  surface?: string;
  targetType?: string;
  targetId?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof window === "undefined") return;

    const url = `${window.location.origin}${path}`;
    try {
      const resolvedSurface =
        surface ??
        (path.startsWith("/alerts")
          ? "alerts"
          : path.startsWith("/briefs")
            ? "brief"
            : path.startsWith("/watchlists")
              ? "watchlist"
              : path.startsWith("/proof")
                ? "proof"
                : "app");

      await fetch("/api/usage-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "share_link",
          surface: resolvedSurface,
          targetType: targetType ?? "link",
          targetId: targetId ?? path,
          metadata: { path, phase: "intent" },
        }),
        keepalive: true,
      }).catch(() => null);

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={handleShare} className="gcir-btn">
      <Link2 className="h-3.5 w-3.5" />
      {copied ? "Copied" : label}
    </button>
  );
}
