import type { SubmissionInput } from "../shared/scoring";

const REDDIT_TIMEOUT_MS = 10_000;
const MAX_REDDIT_RESPONSE_BYTES = 2_000_000;

interface TokenResult {
  accessToken: string;
  expiresIn: number;
}

export class RedditApiError extends Error {
  readonly status: number;
  readonly retryAfter: string | null;

  constructor(status: number, retryAfter: string | null = null) {
    super(`Reddit API returned ${status}`);
    this.name = "RedditApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function readLimitedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get("Content-Length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > MAX_REDDIT_RESPONSE_BYTES) {
    throw new Error("Reddit response was too large");
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REDDIT_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Reddit response was too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new RedditApiError(response.status, response.headers.get("Retry-After"));
  const rawBody = await readLimitedText(response);
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error("Reddit returned invalid JSON");
  }
}

async function oauthFetch(path: string, token: string, userAgent: string): Promise<unknown> {
  const response = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": userAgent,
    },
    signal: AbortSignal.timeout(REDDIT_TIMEOUT_MS),
  });
  return parseJsonResponse(response);
}

export async function exchangeAuthorizationCode(
  code: string,
  redirectUri: string,
  clientId: string,
  clientSecret: string,
  userAgent: string,
): Promise<TokenResult> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body,
    signal: AbortSignal.timeout(REDDIT_TIMEOUT_MS),
  });
  const payload = await parseJsonResponse(response);
  if (!isRecord(payload)) throw new Error("Unexpected Reddit token response");
  const accessToken = asString(payload.access_token);
  const expiresIn = asNumber(payload.expires_in);
  if (!accessToken || expiresIn === null || expiresIn <= 0) throw new Error("Reddit token response was incomplete");
  return { accessToken, expiresIn: Math.min(Math.floor(expiresIn), 3_600) };
}

export async function getIdentity(token: string, userAgent: string): Promise<string> {
  const payload = await oauthFetch("/api/v1/me", token, userAgent);
  if (!isRecord(payload)) throw new Error("Unexpected identity response");
  const name = asString(payload.name);
  if (!name) throw new Error("Identity response did not include a username");
  return name;
}

function listingChildren(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.children)) return [];
  return payload.data.children.flatMap((child) => {
    if (!isRecord(child) || !isRecord(child.data)) return [];
    return [child.data];
  });
}

export async function getModeratedCommunities(token: string, userAgent: string): Promise<string[]> {
  const payload = await oauthFetch("/subreddits/mine/moderator?limit=100&raw_json=1", token, userAgent);
  return listingChildren(payload)
    .map((child) => asString(child.display_name))
    .filter((name): name is string => Boolean(name))
    .sort((left, right) => left.localeCompare(right));
}

export async function getRecentSubmissions(
  subreddit: string,
  token: string,
  userAgent: string,
): Promise<SubmissionInput[]> {
  const payload = await oauthFetch(`/r/${encodeURIComponent(subreddit)}/new?limit=25&raw_json=1`, token, userAgent);
  return listingChildren(payload).slice(0, 25).flatMap((child) => {
    const id = asString(child.id);
    const title = asString(child.title);
    const selfText = asString(child.selftext) ?? "";
    const domain = asString(child.domain) ?? "self";
    const permalink = asString(child.permalink);
    const createdUtc = asNumber(child.created_utc);
    if (!id || !title || !permalink || createdUtc === null) return [];
    return [{ id, title, selfText, domain, permalink, createdUtc }];
  });
}
