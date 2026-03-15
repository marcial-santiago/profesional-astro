// Signed session tokens using HMAC-SHA256 via Web Crypto API (native in Node 18+).
// Format: base64url(payload).base64url(signature)
// The payload contains { sub, iat } — verified against SESSION_DURATION_MS on each request.

const ALGORITHM = { name: "HMAC", hash: "SHA-256" };
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

function toBase64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    ALGORITHM,
    false,
    ["sign", "verify"],
  );
}

export async function createSessionToken(secret: string): Promise<string> {
  const payload = JSON.stringify({ sub: "admin", iat: Date.now() });
  const payloadBytes = new TextEncoder().encode(payload);
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(ALGORITHM, key, payloadBytes);

  return `${toBase64url(payloadBytes.buffer as ArrayBuffer)}.${toBase64url(signature)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<boolean> {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return false;

    const payloadB64 = token.slice(0, dot);
    const sigB64 = token.slice(dot + 1);

    const payloadBytes = fromBase64url(payloadB64);
    const sigBytes = fromBase64url(sigB64);

    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(ALGORITHM, key, sigBytes as BufferSource, payloadBytes as BufferSource);
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    if (typeof payload.iat !== "number") return false;

    // Reject expired tokens
    return Date.now() - payload.iat < SESSION_DURATION_MS;
  } catch {
    return false;
  }
}
