export type ScoreDeltaPresentation = {
  label: string;
  tone: "positive" | "negative" | "neutral";
};

export function formatScoreDelta(delta: number): ScoreDeltaPresentation {
  if (delta > 0) return { label: `▲ +${delta}`, tone: "positive" };
  if (delta < 0) return { label: `▼ ${delta}`, tone: "negative" };
  return { label: "0", tone: "neutral" };
}
