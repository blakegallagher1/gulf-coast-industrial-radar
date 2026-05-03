"use client";

import { Lock, Zap } from "lucide-react";
import { useState } from "react";

export function UpgradeGate({
  feature,
  description,
}: {
  feature: string;
  description: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = await res.json();
      if (body.url) {
        window.location.href = body.url;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-bg-2 px-8 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/[0.08]">
        <Lock className="h-5 w-5 text-accent" />
      </div>
      <h3 className="mb-1.5 text-[16px] font-semibold text-ink">{feature}</h3>
      <p className="mb-5 max-w-sm text-[13px] leading-relaxed text-muted">
        {description}
      </p>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="gcir-btn-primary gap-2 px-5 py-2"
      >
        <Zap className="h-3.5 w-3.5" />
        {loading ? "Redirecting..." : "Upgrade to Pro — $10/mo"}
      </button>
    </div>
  );
}
