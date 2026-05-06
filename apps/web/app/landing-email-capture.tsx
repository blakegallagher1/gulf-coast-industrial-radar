"use client";

import { useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";

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
      <div className={`inline-flex items-center gap-2.5 rounded-[4px] border px-4 py-3 text-[13px] font-medium ${dark ? "border-[#7dd6a3]/30 bg-[#7dd6a3]/[0.06] text-[#7dd6a3]" : "border-info/30 bg-info/[0.06] text-info"}`}>
        <Check className="h-4 w-4" strokeWidth={2.4} />
        Logged. Sample brief is on its way to <span className="font-semibold">{email}</span>.
      </div>
    );
  }

  if (dark) {
    return (
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-bone/35">
            inbox
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-12 w-full rounded-[4px] border border-bone/[0.12] bg-bone/[0.04] pl-[68px] pr-4 font-sans text-[14px] text-bone placeholder:text-bone/30 transition-colors focus:border-[#e9a539]/60 focus:outline-none focus:ring-0"
          />
        </div>
        <button
          type="submit"
          disabled={status === "sending"}
          className="group inline-flex h-12 items-center gap-2 rounded-[4px] bg-[#e9a539] px-6 text-[12.5px] font-semibold uppercase tracking-[0.10em] text-[#0c100e] transition-all hover:bg-[#f4b94f] hover:shadow-[0_0_0_1px_#e9a539,0_8px_24px_rgba(233,165,57,0.34)] disabled:opacity-60"
        >
          {status === "sending" ? "Transmitting…" : (
            <>
              Send sample
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={2.2} />
            </>
          )}
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
        className="h-10 w-64 rounded-[4px] border border-line bg-bone-2 px-3 text-[13px] text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="h-10 rounded-[4px] bg-ink px-5 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-bone transition-colors hover:bg-black"
      >
        {status === "sending" ? "Sending…" : "Get sample brief"}
      </button>
    </form>
  );
}
