// Signed session tokens using HMAC-SHA256 via Web Crypto API (native in Node 18+).
// Format: base64url(payload).base64url(signature)
// The payload contains { sub, iat, jti } — verified against SESSION_DURATION_MS on each request.
// jti (JWT ID) enables token revocation for real logout.

import { prisma } from "./prisma";

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

/**
 * Generate a random JWT ID for token revocation tracking.
 */
function generateJti(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(secret: string): Promise<string> {
  const jti = generateJti();
  const payload = JSON.stringify({ sub: "admin", iat: Date.now(), jti });
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
    if (Date.now() - payload.iat >= SESSION_DURATION_MS) return false;

    // Check if token has been revoked (logout)
    if (payload.jti) {
      const revoked = await prisma.revokedToken.findUnique({
        where: { jti: payload.jti },
      });
      if (revoked) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Revoke a token by its JTI — called on logout for real invalidation.
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    const dot = token.indexOf(".");
    if (dot === -1) return;

    const payloadB64 = token.slice(0, dot);
    const payloadBytes = fromBase64url(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

    if (payload.jti) {
      await prisma.revokedToken.create({
        data: { jti: payload.jti },
      });
    }
  } catch {
    // Silently fail — token is already invalid
  }
}

/**
 * Cleanup expired revoked tokens — run periodically.
 */
export async function cleanupRevokedTokens(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - SESSION_DURATION_MS);
    await prisma.revokedToken.deleteMany({
      where: { revokedAt: { lt: cutoff } },
    });
  } catch {
    // Silently fail
  }
}
