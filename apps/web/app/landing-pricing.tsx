"use client";

import { useState } from "react";
import { Zap } from "lucide-react";

export function PricingCTA() {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (body.url) window.location.href = body.url;
      else window.location.href = "/sign-up";
    } catch {
      window.location.href = "/sign-up";
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 text-[14px] font-semibold text-white shadow-sm transition-colors hover:bg-accent-ink"
    >
      <Zap className="h-4 w-4" />
      {loading ? "Redirecting..." : "Subscribe — $10/mo"}
    </button>
  );
}
