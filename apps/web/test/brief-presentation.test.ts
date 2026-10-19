import { describe, expect, it } from "vitest";
import { canViewBriefRecipientDetails } from "../lib/brief-delivery";
import { formatScoreDelta } from "../lib/score-delta";

describe("brief presentation privacy and score movement", () => {
  it("reveals recipient delivery detail only to operator roles", () => {
    expect(canViewBriefRecipientDetails({ role: "admin", developmentBypass: false })).toBe(true);
    expect(canViewBriefRecipientDetails({ role: "operator", developmentBypass: false })).toBe(true);
    expect(canViewBriefRecipientDetails({ role: "analyst", developmentBypass: false })).toBe(false);
    expect(canViewBriefRecipientDetails(null)).toBe(false);
    expect(canViewBriefRecipientDetails({ role: "analyst", developmentBypass: true })).toBe(true);
  });

  it("formats positive, negative, and zero deltas without false direction", () => {
    expect(formatScoreDelta(5)).toEqual({ label: "▲ +5", tone: "positive" });
    expect(formatScoreDelta(-5)).toEqual({ label: "▼ -5", tone: "negative" });
    expect(formatScoreDelta(0)).toEqual({ label: "0", tone: "neutral" });
  });
});
