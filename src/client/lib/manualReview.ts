import type { SubmissionInput } from "../../shared/scoring";

export const MAX_MANUAL_SUBMISSIONS = 25;

export interface ManualSubmissionDraft {
  title: string;
  selfText: string;
  domain: string;
  permalink: string;
}

interface ManualRecord {
  title: unknown;
  selfText?: unknown;
  body?: unknown;
  domain?: unknown;
  permalink?: unknown;
}

function normalizePermalink(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/r/")) return trimmed;

  try {
    const url = new URL(trimmed);
    if (
      url.protocol !== "https:" ||
      !["www.reddit.com", "reddit.com", "old.reddit.com"].includes(url.hostname) ||
      !url.pathname.startsWith("/r/")
    ) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function validateManualDraft(
  draft: ManualSubmissionDraft,
  sequence: number,
  now = Date.now(),
): { submission?: SubmissionInput; error?: string } {
  const title = draft.title.trim();
  if (!title) return { error: "Add a title before reviewing this submission." };
  if (title.length > 300) return { error: "Keep the title to 300 characters or fewer." };

  const selfText = draft.selfText.trim();
  if (selfText.length > 8_000) return { error: "Keep the body to 8,000 characters or fewer." };

  const permalink = normalizePermalink(draft.permalink);
  if (permalink === null) return { error: "Use a Reddit permalink or path; SubShield never fetches it." };

  const domain = draft.domain.trim().toLowerCase().replace(/^www\./, "") || "self";
  if (domain.length > 253 || /\s/.test(domain)) return { error: "Enter a valid domain, or leave it as self." };

  return {
    submission: {
      id: `manual-${now}-${sequence}`,
      title,
      selfText,
      domain,
      permalink,
      createdUtc: Math.floor(now / 1_000),
    },
  };
}

function asManualRecord(value: unknown): ManualRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  return {
    title: record.title,
    selfText: record.selfText,
    body: record.body,
    domain: record.domain,
    permalink: record.permalink,
  };
}

export function parseManualJson(
  raw: string,
  existingCount: number,
  now = Date.now(),
): { submissions?: SubmissionInput[]; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { error: "Paste a valid JSON array of submissions." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Paste a non-empty JSON array of submissions." };
  }
  if (existingCount + parsed.length > MAX_MANUAL_SUBMISSIONS) {
    return { error: `Keep the manual review queue to ${MAX_MANUAL_SUBMISSIONS} submissions.` };
  }

  const submissions: SubmissionInput[] = [];
  for (const [index, value] of parsed.entries()) {
    const record = asManualRecord(value);
    if (!record || typeof record.title !== "string") {
      return { error: `Submission ${index + 1} needs a string title.` };
    }
    const result = validateManualDraft(
      {
        title: record.title,
        selfText: typeof record.selfText === "string" ? record.selfText : typeof record.body === "string" ? record.body : "",
        domain: typeof record.domain === "string" ? record.domain : "self",
        permalink: typeof record.permalink === "string" ? record.permalink : "",
      },
      existingCount + index,
      now,
    );
    if (!result.submission) return { error: `Submission ${index + 1}: ${result.error ?? "Invalid submission."}` };
    submissions.push(result.submission);
  }
  return { submissions };
}
