import type { SubmissionInput } from "../shared/scoring";

interface TokenResult {
  accessToken: string;
  expiresIn: number;
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

async function parseJsonResponse(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error(`Reddit API returned ${response.status}`);
  return response.json<unknown>();
}

async function oauthFetch(path: string, token: string, userAgent: string): Promise<unknown> {
  const response = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": userAgent,
    },
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
  });
  const payload = await parseJsonResponse(response);
  if (!isRecord(payload)) throw new Error("Unexpected Reddit token response");
  const accessToken = asString(payload.access_token);
  const expiresIn = asNumber(payload.expires_in);
  if (!accessToken || !expiresIn) throw new Error("Reddit token response was incomplete");
  return { accessToken, expiresIn: Math.min(expiresIn, 3_600) };
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
  return listingChildren(payload).flatMap((child) => {
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
