export type RiskLevel = "low" | "medium" | "high";

export interface SubmissionInput {
  id: string;
  title: string;
  selfText: string;
  domain: string;
  permalink: string;
  createdUtc: number;
}

export interface SignalScore {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

export interface ScoredSubmission extends Omit<SubmissionInput, "selfText"> {
  spam: SignalScore;
  language: SignalScore;
}

const spamPhrases = [
  "act now",
  "earn cash",
  "free gift",
  "guaranteed income",
  "limited time offer",
  "message me for details",
  "risk free",
  "send crypto",
];

const highRiskPhrases = [
  "kill yourself",
  "i will find you",
  "i'll find you",
  "dox you",
  "you should die",
];

const aggressivePhrases = [
  "you are an idiot",
  "you're an idiot",
  "shut up",
  "worthless",
  "hate you",
];

const shortenerDomains = new Set([
  "bit.ly",
  "cutt.ly",
  "is.gd",
  "rb.gy",
  "tinyurl.com",
  "t.co",
]);

function levelFor(score: number): RiskLevel {
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function uppercaseRatio(value: string): number {
  const letters = value.match(/[a-z]/gi) ?? [];
  if (letters.length < 12) return 0;
  const uppercase = letters.filter((letter) => letter === letter.toUpperCase()).length;
  return uppercase / letters.length;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function scoreSubmission(input: SubmissionInput): ScoredSubmission {
  const combined = `${input.title}\n${input.selfText}`.slice(0, 8_000);
  const normalized = combined.toLowerCase();
  const spamReasons: string[] = [];
  const languageReasons: string[] = [];
  let spamScore = 0;
  let languageScore = 0;

  for (const phrase of spamPhrases) {
    if (normalized.includes(phrase)) {
      spamScore += 2;
      spamReasons.push(`Promotional phrase: “${phrase}”`);
    }
  }

  if (shortenerDomains.has(input.domain.toLowerCase())) {
    spamScore += 2;
    spamReasons.push("Link-shortener domain");
  }

  const urlCount = combined.match(/https?:\/\//gi)?.length ?? 0;
  if (urlCount >= 3) {
    spamScore += 2;
    spamReasons.push("Several outbound links");
  }

  if (/(\$|€|£)\s?\d{2,}/.test(combined) && /(earn|profit|return|cash)/i.test(combined)) {
    spamScore += 2;
    spamReasons.push("Money claim");
  }

  if (/[!?]{4,}/.test(combined)) {
    spamScore += 1;
    spamReasons.push("Excessive punctuation");
  }

  for (const phrase of highRiskPhrases) {
    if (normalized.includes(phrase)) {
      languageScore += 4;
      languageReasons.push("Direct threat or self-harm phrase");
    }
  }

  for (const phrase of aggressivePhrases) {
    if (normalized.includes(phrase)) {
      languageScore += 2;
      languageReasons.push("Targeted hostile phrase");
    }
  }

  if (uppercaseRatio(combined) > 0.72) {
    languageScore += 1;
    languageReasons.push("Sustained all-caps language");
  }

  return {
    id: input.id,
    title: input.title,
    domain: input.domain,
    permalink: input.permalink,
    createdUtc: input.createdUtc,
    spam: {
      level: levelFor(spamScore),
      score: spamScore,
      reasons: unique(spamReasons),
    },
    language: {
      level: levelFor(languageScore),
      score: languageScore,
      reasons: unique(languageReasons),
    },
  };
}
