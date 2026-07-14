import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  clearCookie,
  openJson,
  parseSession,
  parseState,
  readCookie,
  sealJson,
  secureCookie,
} from "./auth";

const cookieKey = "test-cookie-key-with-at-least-32-characters";

describe("OAuth session protection", () => {
  it("encrypts and decrypts session data without exposing plaintext", async () => {
    const value = { accessToken: "temporary-token", expiresAt: 1_800_000_000_000 };
    const sealed = await sealJson(value, cookieKey);

    expect(sealed).not.toContain("temporary-token");
    expect(await openJson(sealed, cookieKey)).toEqual(value);
    expect(await openJson(sealed, `${cookieKey}-wrong`)).toBeNull();
  });

  it("rejects malformed session and OAuth state payloads", () => {
    expect(parseSession({ accessToken: "token" })).toBeNull();
    expect(parseSession({ accessToken: 42, expiresAt: 10 })).toBeNull();
    expect(parseState({ nonce: "nonce" })).toBeNull();
    expect(parseState({ nonce: "nonce", expiresAt: 10 })).toEqual({ nonce: "nonce", expiresAt: 10 });
  });

  it("sets and clears secure, host-wide, same-site cookies", () => {
    const setCookie = secureCookie(SESSION_COOKIE, "sealed", 3_600);
    const deletedCookie = clearCookie(SESSION_COOKIE);

    expect(setCookie).toContain("Max-Age=3600");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(deletedCookie).toContain("Max-Age=0");
  });

  it("reads only the named cookie", () => {
    const request = new Request("https://subshield.example/api/session", {
      headers: { Cookie: "other=value; subshield_session=sealed.value; final=1" },
    });

    expect(readCookie(request, SESSION_COOKIE)).toBe("sealed.value");
    expect(readCookie(request, "missing")).toBeNull();
  });
});
