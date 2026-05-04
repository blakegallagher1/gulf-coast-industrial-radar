"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function EmailCapture({ dark = false }: { dark?: boolean }) {
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
      <p className={`text-[14px] font-medium ${dark ? "text-[#10a37f]" : "text-accent"}`}>
        Check your inbox — a sample brief is on the way.
      </p>
    );
  }

  if (dark) {
    return (
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="h-11 flex-1 rounded-lg border border-white/[0.1] bg-white/[0.05] px-4 text-[13.5px] text-white placeholder:text-white/25 focus:border-[#10a37f]/60 focus:outline-none focus:ring-0 transition-colors"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-white px-5 text-[13px] font-semibold text-[#0a0a0a] transition-colors hover:bg-white/90 disabled:opacity-50"
        >
          {status === "sending" ? "…" : <><span>Send</span><ArrowRight className="h-3.5 w-3.5" /></>}
        </button>
      </form>
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
