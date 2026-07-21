import { scoreSubmission } from "../shared/scoring";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  clearCookie,
  constantTimeEqual,
  openJson,
  parseSession,
  parseState,
  randomState,
  readCookie,
  sealJson,
  secureCookie,
} from "./auth";
import {
  exchangeAuthorizationCode,
  getIdentity,
  getModeratedCommunities,
  getRecentSubmissions,
  RedditApiError,
} from "./reddit";

const MIN_SCAN_INTERVAL_MS = 10_000;
const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
};
const requestTextEncoder = new TextEncoder();

function json(value: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(noStoreHeaders);
  if (extraHeaders) {
    for (const [key, headerValue] of new Headers(extraHeaders)) headers.append(key, headerValue);
  }
  return new Response(JSON.stringify(value), { status, headers });
}

function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function isConfigured(env: Env): boolean {
  return (
    !env.REDDIT_CLIENT_ID.startsWith("PENDING_") &&
    !env.REDDIT_CLIENT_SECRET.startsWith("PENDING_") &&
    !env.COOKIE_KEY.startsWith("PENDING_") &&
    env.COOKIE_KEY.length >= 32
  );
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function redditErrorResponse(error: unknown, clearSession = false): Response | null {
  if (!(error instanceof RedditApiError)) return null;
  if ((error.status === 401 || error.status === 403) && clearSession) {
    return json({ authenticated: false, configured: true }, 200, {
      "Set-Cookie": clearCookie(SESSION_COOKIE),
    });
  }
  const headers = error.retryAfter ? { "Retry-After": error.retryAfter } : undefined;
  if (error.status === 429) {
    return json({ error: "Reddit is rate-limiting requests. Try again shortly." }, 429, headers);
  }
  if (error.status === 401 || error.status === 403) {
    return json({ error: "Reddit authorization expired. Connect again." }, 401, {
      ...headers,
      "Set-Cookie": clearCookie(SESSION_COOKIE),
    });
  }
  if (error.status >= 500) {
    return json({ error: "Reddit is temporarily unavailable. Try again shortly." }, 503, headers);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function sessionFromRequest(request: Request, env: Env) {
  const cookie = readCookie(request, SESSION_COOKIE);
  if (!cookie) return null;
  const session = parseSession(await openJson(cookie, env.COOKIE_KEY));
  if (!session || session.expiresAt <= Date.now()) return null;
  return session;
}

async function handleAuthorize(request: Request, env: Env): Promise<Response> {
  if (!isConfigured(env)) return redirect("/?status=approval-pending");
  const url = new URL(request.url);
  const nonce = randomState();
  const stateCookie = await sealJson({ nonce, expiresAt: Date.now() + 10 * 60_000 }, env.COOKIE_KEY);
  const authorizeUrl = new URL("https://www.reddit.com/api/v1/authorize");
  authorizeUrl.search = new URLSearchParams({
    client_id: env.REDDIT_CLIENT_ID,
    response_type: "code",
    state: nonce,
    redirect_uri: `${url.origin}/oauth/callback`,
    duration: "temporary",
    scope: "identity read mysubreddits",
  }).toString();
  return redirect(authorizeUrl.toString(), [secureCookie(STATE_COOKIE, stateCookie, 10 * 60)]);
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  if (!isConfigured(env)) return redirect("/?status=approval-pending");
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  if (oauthError) return redirect("/?oauth=declined", [clearCookie(STATE_COOKIE)]);
  if (!code || !returnedState) return redirect("/?oauth=invalid", [clearCookie(STATE_COOKIE)]);

  const stateCookie = readCookie(request, STATE_COOKIE);
  const state = stateCookie ? parseState(await openJson(stateCookie, env.COOKIE_KEY)) : null;
  if (!state || state.expiresAt <= Date.now() || !(await constantTimeEqual(returnedState, state.nonce))) {
    return redirect("/?oauth=invalid-state", [clearCookie(STATE_COOKIE)]);
  }

  const token = await exchangeAuthorizationCode(
    code,
    `${url.origin}/oauth/callback`,
    env.REDDIT_CLIENT_ID,
    env.REDDIT_CLIENT_SECRET,
    env.APP_USER_AGENT,
  );
  const expiresAt = Date.now() + token.expiresIn * 1_000;
  const sessionCookie = await sealJson({ accessToken: token.accessToken, expiresAt }, env.COOKIE_KEY);
  return redirect("/?connected=1", [
    clearCookie(STATE_COOKIE),
    secureCookie(SESSION_COOKIE, sessionCookie, token.expiresIn),
  ]);
}

async function handleSession(request: Request, env: Env): Promise<Response> {
  if (!isConfigured(env)) return json({ authenticated: false, configured: false });
  const session = await sessionFromRequest(request, env);
  if (!session) {
    return json({ authenticated: false, configured: true }, 200, {
      "Set-Cookie": clearCookie(SESSION_COOKIE),
    });
  }

  try {
    const [username, communities] = await Promise.all([
      getIdentity(session.accessToken, env.APP_USER_AGENT),
      getModeratedCommunities(session.accessToken, env.APP_USER_AGENT),
    ]);
    return json({ authenticated: true, configured: true, username, communities });
  } catch (error) {
    const response = redditErrorResponse(error, true);
    if (response) return response;
    throw error;
  }
}

async function handleScan(request: Request, env: Env): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: "Origin check failed" }, 403);
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (contentLength > 2_048) return json({ error: "Request body is too large" }, 413);
  const rawBody = await request.text();
  if (requestTextEncoder.encode(rawBody).byteLength > 2_048) {
    return json({ error: "Request body is too large" }, 413);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }
  const session = await sessionFromRequest(request, env);
  if (!session) return json({ error: "Authorization required" }, 401);
  const now = Date.now();
  const elapsed = session.lastScanAt === undefined ? MIN_SCAN_INTERVAL_MS : now - session.lastScanAt;
  if (elapsed < MIN_SCAN_INTERVAL_MS) {
    return json(
      { error: "Please wait before running another scan." },
      429,
      { "Retry-After": String(Math.ceil((MIN_SCAN_INTERVAL_MS - Math.max(0, elapsed)) / 1_000)) },
    );
  }
  if (!isRecord(payload) || typeof payload.subreddit !== "string" || !/^[A-Za-z0-9_]{2,21}$/.test(payload.subreddit)) {
    return json({ error: "Choose a valid community" }, 400);
  }

  const requestedSubreddit = payload.subreddit;

  try {
    const communities = await getModeratedCommunities(session.accessToken, env.APP_USER_AGENT);
    const subreddit = communities.find((name) => name.toLowerCase() === requestedSubreddit.toLowerCase());
    if (!subreddit) return json({ error: "You must moderate the selected community" }, 403);

    const submissions = await getRecentSubmissions(subreddit, session.accessToken, env.APP_USER_AGENT);
    const results = submissions.map(scoreSubmission);
    const nextSession = await sealJson({ ...session, lastScanAt: now }, env.COOKIE_KEY);
    const remainingSeconds = Math.max(1, Math.ceil((session.expiresAt - Date.now()) / 1_000));
    return json(
      {
        subreddit,
        scannedAt: new Date().toISOString(),
        results,
        retention: "response-only; no server persistence",
      },
      200,
      { "Set-Cookie": secureCookie(SESSION_COOKIE, nextSession, remainingSeconds) },
    );
  } catch (error) {
    const response = redditErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

async function fetchAsset(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request);
  const contentType = response.headers.get("Content-Type") ?? "";
  if (!contentType.includes("text/html")) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/health") {
    return json({
      ok: true,
      configured: isConfigured(env),
      mode: "on-demand",
      storage: "no Reddit content persistence",
      scopes: ["identity", "read", "mysubreddits"],
    });
  }
  if (request.method === "GET" && url.pathname === "/api/auth/reddit") return handleAuthorize(request, env);
  if (request.method === "GET" && url.pathname === "/oauth/callback") return handleCallback(request, env);
  if (request.method === "GET" && url.pathname === "/api/session") return handleSession(request, env);
  if (request.method === "POST" && url.pathname === "/api/scan") return handleScan(request, env);
  if (request.method === "POST" && url.pathname === "/api/logout") {
    if (!sameOrigin(request)) return json({ error: "Origin check failed" }, 403);
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie(SESSION_COOKIE) });
  }
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/oauth/")) {
    return json({ error: "Not found" }, 404);
  }
  return fetchAsset(request, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      const url = new URL(request.url);
      console.error(
        JSON.stringify({
          message: "request failed",
          path: url.pathname,
          errorType: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return json({ error: "Request failed" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
