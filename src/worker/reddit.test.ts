import { afterEach, describe, expect, it, vi } from "vitest";
import { exchangeAuthorizationCode, getIdentity, RedditApiError } from "./reddit";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("Reddit API boundaries", () => {
  it("uses a timeout signal and validates JSON responses", async () => {
    const fetchMock = vi.fn().mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeDefined();
      return new Response(JSON.stringify({ name: "moderator" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    globalThis.fetch = fetchMock;

    await expect(getIdentity("temporary-token", "web:SubShield:test")).resolves.toBe("moderator");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects oversized Reddit response bodies before parsing them", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("x".repeat(2_000_001), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    await expect(getIdentity("temporary-token", "web:SubShield:test")).rejects.toThrow("too large");
  });

  it("preserves rate-limit metadata without exposing the upstream body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("private upstream detail", { status: 429, headers: { "Retry-After": "7" } }));

    try {
      await getIdentity("temporary-token", "web:SubShield:test");
      throw new Error("Expected RedditApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(RedditApiError);
      expect(error).toMatchObject({ status: 429, retryAfter: "7" });
      expect((error as Error).message).not.toContain("private upstream detail");
    }
  });

  it("rejects non-positive token lifetimes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: "temporary-token", expires_in: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      exchangeAuthorizationCode("code", "https://subshield.example/oauth/callback", "client", "secret", "web:SubShield:test"),
    ).rejects.toThrow("incomplete");
  });
});
