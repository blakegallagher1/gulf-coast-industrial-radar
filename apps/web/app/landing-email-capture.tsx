"use client";

import { useState } from "react";

export function EmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className="text-[14px] font-medium text-accent">
        Check your inbox — a sample brief is on the way.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="h-10 w-64 rounded-lg border border-stone-700 bg-stone-800 px-3 text-[13px] text-white placeholder:text-stone-500 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="h-10 rounded-lg bg-white px-5 text-[13px] font-semibold text-ink transition-colors hover:bg-stone-100"
      >
        {status === "sending" ? "Sending..." : "Get a free sample brief"}
      </button>
    </form>
  );
}
