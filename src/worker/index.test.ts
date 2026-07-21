import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import worker from "./index";
import { SESSION_COOKIE, STATE_COOKIE, sealJson } from "./auth";

const origin = "https://subshield.example";
const cookieKey = "test-cookie-key-with-at-least-32-characters";
const originalFetch = globalThis.fetch;

function env(configured = true): Env {
  return {
    APP_ENV: "production",
    APP_USER_AGENT: "web:SubShield:test (by /u/doncazper)",
    REDDIT_CLIENT_ID: configured ? "client-id" : "PENDING_APPROVAL",
    REDDIT_CLIENT_SECRET: configured ? "client-secret" : "PENDING_APPROVAL",
    COOKIE_KEY: configured ? cookieKey : "PENDING_APPROVAL",
    ASSETS: { fetch: async () => new Response("asset") } as unknown as Fetcher,
  } as unknown as Env;
}

function listing(children: Record<string, unknown>[]) {
  return { data: { children: children.map((data) => ({ data })) } };
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, headers: HeadersInit = {}): Response {
  return new Response("", { status, headers });
}

async function sessionCookie(expiresAt = Date.now() + 60_000): Promise<string> {
  const sealed = await sealJson({ accessToken: "temporary-token", expiresAt }, cookieKey);
  return `${SESSION_COOKIE}=${sealed}`;
}

beforeAll(() => {
  Object.defineProperty(crypto.subtle, "timingSafeEqual", {
    configurable: true,
    value: (left: ArrayBuffer, right: ArrayBuffer) => {
      const leftBytes = new Uint8Array(left);
      const rightBytes = new Uint8Array(right);
      if (leftBytes.length !== rightBytes.length) return false;
      let difference = 0;
      for (let index = 0; index < leftBytes.length; index += 1) {
        difference |= leftBytes[index] ^ rightBytes[index];
      }
      return difference === 0;
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

afterAll(() => {
  Reflect.deleteProperty(crypto.subtle, "timingSafeEqual");
});

describe("Worker policy boundaries", () => {
  it("publishes a no-store health response without user data", async () => {
    const response = await worker.fetch(new Request(`${origin}/api/health`), env(false));
    const payload = await response.json<Record<string, unknown>>();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(payload).toEqual({
      ok: true,
      configured: false,
      mode: "on-demand",
      storage: "no Reddit content persistence",
      scopes: ["identity", "read", "mysubreddits"],
    });
  });

  it("keeps OAuth disabled while credentials are pending", async () => {
    const response = await worker.fetch(new Request(`${origin}/api/auth/reddit`), env(false));

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/?status=approval-pending");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects cross-origin scan requests before reading a session", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
        body: JSON.stringify({ subreddit: "ExampleMod" }),
      }),
      env(),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized scan requests before reading a session", async () => {
    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify({ subreddit: "a".repeat(2_100) }),
      }),
      env(),
    );

    expect(response.status).toBe(413);
  });

  it("returns a bounded client error for malformed JSON", async () => {
    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: "{not-json",
      }),
      env(),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Request body must be valid JSON" });
  });

  it("rejects expired encrypted sessions", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: await sessionCookie(Date.now() - 1),
          Origin: origin,
        },
        body: JSON.stringify({ subreddit: "ExampleMod" }),
      }),
      env(),
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("re-checks moderator membership and caps the response at 25 submissions", async () => {
    const submissions = Array.from({ length: 30 }, (_, index) => ({
      id: `submission-${index}`,
      title: `Synthetic submission ${index}`,
      selftext: "Transient synthetic text",
      domain: "self",
      permalink: `/r/ExampleMod/comments/${index}/synthetic/`,
      created_utc: 1_700_000_000 + index,
    }));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(listing([{ display_name: "ExampleMod" }])))
      .mockResolvedValueOnce(jsonResponse(listing(submissions)));
    globalThis.fetch = fetchMock;

    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: await sessionCookie(),
          Origin: origin,
        },
        body: JSON.stringify({ subreddit: "examplemod" }),
      }),
      env(),
    );
    const payload = await response.json<{ results: Array<Record<string, unknown>> }>();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(payload.results).toHaveLength(25);
    expect(payload.results[0]).not.toHaveProperty("selfText");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/subreddits/mine/moderator?limit=100");
    expect(String(fetchMock.mock.calls[1][0])).toContain("/r/ExampleMod/new?limit=25");
  });

  it("returns 403 when the requested community is not moderated", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(listing([{ display_name: "AnotherCommunity" }])));
    globalThis.fetch = fetchMock;
    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: await sessionCookie(),
          Origin: origin,
        },
        body: JSON.stringify({ subreddit: "ExampleMod" }),
      }),
      env(),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a mismatched OAuth state before exchanging the authorization code", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const sealedState = await sealJson({ nonce: "expected-state", expiresAt: Date.now() + 60_000 }, cookieKey);
    const response = await worker.fetch(
      new Request(`${origin}/oauth/callback?code=authorization-code&state=wrong-state`, {
        headers: { Cookie: `${STATE_COOKIE}=${sealedState}` },
      }),
      env(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/?oauth=invalid-state");
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("completes OAuth and redirects back to the real application route", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ access_token: "temporary-token", expires_in: 3_600 }));
    globalThis.fetch = fetchMock;
    const sealedState = await sealJson({ nonce: "expected-state", expiresAt: Date.now() + 60_000 }, cookieKey);
    const response = await worker.fetch(
      new Request(`${origin}/oauth/callback?code=authorization-code&state=expected-state`, {
        headers: { Cookie: `${STATE_COOKIE}=${sealedState}` },
      }),
      env(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/?connected=1");
    expect(response.headers.get("Set-Cookie")).toContain(`${SESSION_COOKIE}=`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears a session when Reddit reports that authorization expired", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(errorResponse(401));
    const response = await worker.fetch(
      new Request(`${origin}/api/session`, { headers: { Cookie: await sessionCookie() } }),
      env(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false, configured: true });
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });

  it("maps Reddit rate limits without retrying or leaking upstream content", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(errorResponse(429, { "Retry-After": "5" }));
    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: await sessionCookie(),
          Origin: origin,
        },
        body: JSON.stringify({ subreddit: "ExampleMod" }),
      }),
      env(),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toEqual({ error: "Reddit is rate-limiting requests. Try again shortly." });
  });

  it("enforces a short per-session scan cooldown without persistent storage", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(listing([{ display_name: "ExampleMod" }])))
      .mockResolvedValueOnce(jsonResponse(listing([])));
    globalThis.fetch = fetchMock;
    const response = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: await sessionCookie(),
          Origin: origin,
        },
        body: JSON.stringify({ subreddit: "ExampleMod" }),
      }),
      env(),
    );
    const refreshedCookie = response.headers.get("Set-Cookie")?.split(";", 1)[0];
    expect(response.status).toBe(200);
    expect(refreshedCookie).toBeTruthy();

    const throttled = await worker.fetch(
      new Request(`${origin}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: refreshedCookie ?? "",
          Origin: origin,
        },
        body: JSON.stringify({ subreddit: "ExampleMod" }),
      }),
      env(),
    );

    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("Retry-After")).toBe("10");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
