import { STAGE_COLOR, STAGE_LABELS, type ProjectStage } from "@gcir/shared";
import { cn } from "@/lib/cn";

export function StageTag({
  stage,
  className,
}: {
  stage: ProjectStage | string;
  className?: string;
}) {
  const key = stage as ProjectStage;
  const dotColor = STAGE_COLOR[key] ?? "#6b6b6b";
  const label = STAGE_LABELS[key] ?? String(stage).toLowerCase().replace(/_/g, "-");
  return (
    <span className={cn("gcir-tag", className)}>
      <span className="dot" style={{ background: dotColor }} />
      {label}
    </span>
  );
}
