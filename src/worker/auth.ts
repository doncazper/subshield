const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const SESSION_COOKIE = "subshield_session";
export const STATE_COOKIE = "subshield_oauth_state";

export interface SessionPayload {
  accessToken: string;
  expiresAt: number;
  lastScanAt?: number;
}

export interface StatePayload {
  nonce: string;
  expiresAt: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function sealJson(value: unknown, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(secret);
  const plaintext = textEncoder.encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
}

export async function openJson(value: string, secret: string): Promise<unknown> {
  const [ivPart, ciphertextPart, extra] = value.split(".");
  if (!ivPart || !ciphertextPart || extra) return null;

  try {
    const key = await encryptionKey(secret);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(ivPart) },
      key,
      base64UrlToBytes(ciphertextPart),
    );
    return JSON.parse(textDecoder.decode(plaintext)) as unknown;
  } catch {
    return null;
  }
}

export function randomState(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
}

export async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", textEncoder.encode(left)),
    crypto.subtle.digest("SHA-256", textEncoder.encode(right)),
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const segment of header.split(";")) {
    const separator = segment.indexOf("=");
    if (separator === -1) continue;
    const key = segment.slice(0, separator).trim();
    if (key !== name) continue;
    return segment.slice(separator + 1).trim();
  }
  return null;
}

export function secureCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name: string): string {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseSession(value: unknown): SessionPayload | null {
  if (!isRecord(value)) return null;
  if (typeof value.accessToken !== "string" || typeof value.expiresAt !== "number") return null;
  if (value.lastScanAt !== undefined && typeof value.lastScanAt !== "number") return null;
  return {
    accessToken: value.accessToken,
    expiresAt: value.expiresAt,
    ...(value.lastScanAt === undefined ? {} : { lastScanAt: value.lastScanAt }),
  };
}

export function parseState(value: unknown): StatePayload | null {
  if (!isRecord(value)) return null;
  if (typeof value.nonce !== "string" || typeof value.expiresAt !== "number") return null;
  return { nonce: value.nonce, expiresAt: value.expiresAt };
}
