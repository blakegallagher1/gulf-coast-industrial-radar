"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export function TrackedLink({
  href,
  eventType,
  surface,
  targetType,
  targetId,
  metadata,
  className,
  children,
}: {
  href: string;
  eventType: string;
  surface: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
}) {
  async function handleClick() {
    await fetch("/api/usage-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        surface,
        targetType,
        targetId,
        metadata,
      }),
      keepalive: true,
    }).catch(() => null);
  }

  return (
    <Link href={href as any} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
