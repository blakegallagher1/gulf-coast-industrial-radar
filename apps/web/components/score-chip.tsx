import { scoreBand } from "@gcir/shared";
import { bandClasses } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ScoreChip({ score, className }: { score: number; className?: string }) {
  const band = scoreBand(score);
  const { bg, text, ring } = bandClasses(band);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-[4px] border px-1.5 py-0.5 font-mono text-[11.5px] font-semibold tabular-nums",
        bg,
        text,
        ring,
        className,
      )}
    >
      {score}
    </span>
  );
}
