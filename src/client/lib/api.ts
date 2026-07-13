import type { AppHealth, ScanResponse, SessionState } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSignalScore(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.level === "low" || value.level === "medium" || value.level === "high") &&
    typeof value.score === "number" &&
    Array.isArray(value.reasons) &&
    value.reasons.every((reason) => typeof reason === "string")
  );
}

function isScanResult(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.domain === "string" &&
    typeof value.permalink === "string" &&
    typeof value.createdUtc === "number" &&
    isSignalScore(value.spam) &&
    isSignalScore(value.language)
  );
}

function isScanResponse(value: unknown): value is ScanResponse {
  return (
    isRecord(value) &&
    typeof value.subreddit === "string" &&
    typeof value.scannedAt === "string" &&
    typeof value.retention === "string" &&
    Array.isArray(value.results) &&
    value.results.every(isScanResult)
  );
}

async function responseJson(response: Response): Promise<unknown> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : "Request failed";
    throw new Error(message);
  }
  return payload;
}

export async function loadHealth(signal?: AbortSignal): Promise<AppHealth> {
  const payload = await responseJson(await fetch("/api/health", { signal, cache: "no-store" }));
  if (
    !isRecord(payload) ||
    payload.ok !== true ||
    typeof payload.configured !== "boolean" ||
    typeof payload.mode !== "string" ||
    typeof payload.storage !== "string" ||
    !Array.isArray(payload.scopes) ||
    !payload.scopes.every((scope) => typeof scope === "string")
  ) {
    throw new Error("Unexpected health response");
  }
  return {
    ok: true,
    configured: payload.configured,
    mode: payload.mode,
    storage: payload.storage,
    scopes: payload.scopes,
  };
}

export async function loadSession(signal?: AbortSignal): Promise<SessionState> {
  const payload = await responseJson(await fetch("/api/session", { signal, cache: "no-store" }));
  if (!isRecord(payload) || typeof payload.authenticated !== "boolean") {
    throw new Error("Unexpected session response");
  }
  if (!payload.authenticated) {
    return { status: "anonymous", configured: payload.configured === true };
  }
  if (
    typeof payload.username !== "string" ||
    !Array.isArray(payload.communities) ||
    !payload.communities.every((community) => typeof community === "string")
  ) {
    throw new Error("Unexpected session response");
  }
  return { status: "authenticated", username: payload.username, communities: payload.communities };
}

export async function runScan(subreddit: string): Promise<ScanResponse> {
  const payload = await responseJson(
    await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subreddit }),
    }),
  );
  if (!isScanResponse(payload)) {
    throw new Error("Unexpected scan response");
  }
  return payload;
}

export async function logout(): Promise<void> {
  await responseJson(await fetch("/api/logout", { method: "POST" }));
}
