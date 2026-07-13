import { describe, expect, it } from "vitest";
import { scoreSubmission, type SubmissionInput } from "./scoring";

function submission(overrides: Partial<SubmissionInput> = {}): SubmissionInput {
  return {
    id: "test",
    title: "A normal question",
    selfText: "Could someone help me understand this configuration?",
    domain: "self",
    permalink: "/r/example/comments/test/a_normal_question/",
    createdUtc: 1_700_000_000,
    ...overrides,
  };
}

describe("scoreSubmission", () => {
  it("keeps an ordinary help request low risk", () => {
    const result = scoreSubmission(submission());
    expect(result.spam.level).toBe("low");
    expect(result.language.level).toBe("low");
  });

  it("flags combined promotional and shortener signals", () => {
    const result = scoreSubmission(
      submission({
        title: "Earn cash fast today",
        selfText: "Act now for guaranteed income.",
        domain: "bit.ly",
      }),
    );
    expect(result.spam.level).toBe("high");
    expect(result.spam.reasons).toContain("Link-shortener domain");
  });

  it("flags a direct threat as high language risk", () => {
    const result = scoreSubmission(submission({ selfText: "I will find you and dox you." }));
    expect(result.language.level).toBe("high");
  });

  it("never includes self-text in the returned result", () => {
    const result = scoreSubmission(submission({ selfText: "Transient content" }));
    expect("selfText" in result).toBe(false);
  });

  it("deduplicates repeated reason labels", () => {
    const result = scoreSubmission(submission({ selfText: "You are an idiot. You are an idiot." }));
    expect(result.language.reasons).toEqual(["Targeted hostile phrase"]);
  });
});
