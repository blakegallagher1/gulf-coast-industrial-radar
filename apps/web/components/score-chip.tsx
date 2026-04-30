import { scoreBand } from "@gcir/shared";
import { bandClasses } from "@/lib/format";
import { cn } from "@/lib/cn";

export function ScoreChip({ score, className }: { score: number; className?: string }) {
  const band = scoreBand(score);
  const { bg, text } = bandClasses(band);
  return (
    <span
      className={cn(
        "gcir-score-chip",
        bg,
        text,
        className,
      )}
    >
      {score}
    </span>
  );
}
