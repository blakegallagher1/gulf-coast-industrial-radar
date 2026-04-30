import { cn } from "@/lib/cn";

export function ConfPill({
  confidence,
  className,
}: {
  confidence: number;
  className?: string;
}) {
  const tier = confidence >= 0.85 ? "high" : confidence >= 0.6 ? "med" : "low";
  const dot =
    tier === "high"
      ? "bg-accent"
      : tier === "med"
        ? "bg-warn"
        : "bg-muted";
  const label =
    tier === "high" ? "High" : tier === "med" ? "Med" : "Low";
  return (
    <span className={cn("gcir-conf-pill", className)}>
      <span className={cn("h-[5px] w-[5px] rounded-full", dot)} />
      {label} · {confidence.toFixed(2)}
    </span>
  );
}
