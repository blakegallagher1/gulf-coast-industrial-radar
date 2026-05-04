"use client";

import { useEffect, useRef } from "react";

export function UsageEventTracker({
  eventType,
  surface,
  targetType,
  targetId,
  metadata,
}: {
  eventType: string;
  surface: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    void fetch("/api/usage-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        surface,
        targetType,
        targetId,
        metadata,
      }),
    }).catch(() => null);
  }, [eventType, surface, targetType, targetId, metadata]);

  return null;
}
