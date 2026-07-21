import { describe, expect, it } from "vitest";
import { MAX_MANUAL_SUBMISSIONS, parseManualJson, validateManualDraft } from "./manualReview";

describe("manual review input", () => {
  it("normalizes a draft without making a network request", () => {
    const result = validateManualDraft(
      {
        title: "  Check this link  ",
        selfText: "  A short body. ",
        domain: "www.Example.com",
        permalink: "https://www.reddit.com/r/demo/comments/abc123/example/?sort=new",
      },
      0,
      1_700_000_000_000,
    );

    expect(result.error).toBeUndefined();
    expect(result.submission).toMatchObject({
      id: "manual-1700000000000-0",
      title: "Check this link",
      selfText: "A short body.",
      domain: "example.com",
      permalink: "/r/demo/comments/abc123/example/?sort=new",
      createdUtc: 1_700_000_000,
    });
  });

  it("rejects external references and missing titles", () => {
    expect(
      validateManualDraft({ title: "", selfText: "", domain: "self", permalink: "" }, 0).error,
    ).toMatch(/title/i);
    expect(
      validateManualDraft(
        { title: "External", selfText: "", domain: "self", permalink: "https://example.com/post" },
        0,
      ).error,
    ).toMatch(/Reddit permalink/i);
  });

  it("accepts body as a JSON alias and preserves the queue cap", () => {
    const result = parseManualJson(
      JSON.stringify([
        { title: "One", body: "Body", domain: "self" },
        { title: "Two", permalink: "/r/demo/comments/xyz/two" },
      ]),
      0,
      1_700_000_000_000,
    );

    expect(result.error).toBeUndefined();
    expect(result.submissions).toHaveLength(2);
    expect(result.submissions?.[0].selfText).toBe("Body");
    expect(result.submissions?.[1].permalink).toBe("/r/demo/comments/xyz/two");

    const overCap = parseManualJson(
      JSON.stringify(Array.from({ length: 2 }, (_, index) => ({ title: `Post ${index}` }))),
      MAX_MANUAL_SUBMISSIONS - 1,
    );
    expect(overCap.error).toMatch(/25 submissions/);
  });

  it("rejects malformed JSON without partial queue results", () => {
    expect(parseManualJson("{\"title\":\"not an array\"}", 0).error).toMatch(/JSON array/i);
    expect(parseManualJson("[{\"title\":\"ok\"},{\"body\":\"missing title\"}]", 0).error).toMatch(/Submission 2/);
  });
});
