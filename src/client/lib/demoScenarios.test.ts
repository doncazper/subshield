import { describe, expect, it } from "vitest";
import { scoreSubmission } from "../../shared/scoring";
import { demoScenarios } from "./demoScenarios";

describe("local demo scenarios", () => {
  it("contains only synthetic, non-linkable examples", () => {
    expect(demoScenarios).toHaveLength(4);
    expect(demoScenarios.every((scenario) => scenario.inputs.length > 0)).toBe(true);
    expect(demoScenarios.flatMap((scenario) => scenario.inputs).every((input) => input.permalink === "")).toBe(true);
  });

  it("covers the published scoring outcomes without contacting Reddit", () => {
    const results = demoScenarios.flatMap((scenario) => scenario.inputs.map(scoreSubmission));

    expect(results.some((result) => result.spam.reasons.length > 0)).toBe(true);
    expect(results.some((result) => result.language.reasons.length > 0)).toBe(true);
    expect(results.some((result) => result.spam.reasons.length === 0 && result.language.reasons.length === 0)).toBe(true);
  });
});
