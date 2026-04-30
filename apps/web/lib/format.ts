/** UI formatters — keep them all in one place so labels stay consistent. */

export function fmtAcres(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1000) return `${Math.round(n).toLocaleString()} ac`;
  return `${n.toFixed(1)} ac`;
}

export function fmtUSD(n: number | bigint | null | undefined, opts?: { compact?: boolean }): string {
  if (n == null) return "—";
  const num = typeof n === "bigint" ? Number(n) : n;
  if (opts?.compact) {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}k`;
  }
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export function fmtAge(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

export function fmtStage(s: string): string {
  return s.toLowerCase().replace(/_/g, "-");
}

/** Score band → palette token classnames. */
export function bandClasses(band: "high" | "elevated" | "watch" | "weak" | "noise"): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (band) {
    case "high":     return { bg: "bg-crit/[0.08]",  text: "text-crit",       ring: "border-crit"      };
    case "elevated": return { bg: "bg-warn/[0.08]",  text: "text-warn",       ring: "border-warn"      };
    case "watch":    return { bg: "bg-info/[0.08]",  text: "text-info",       ring: "border-info"      };
    case "weak":     return { bg: "bg-bg-3",         text: "text-muted",      ring: "border-stone-400" };
    default:         return { bg: "bg-bg-3",         text: "text-muted-2",    ring: "border-line"      };
  }
}
