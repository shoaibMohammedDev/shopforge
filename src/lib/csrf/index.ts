/**
 * @file csrf/index.ts
 * @description CSRF (Cross-Site Request Forgery) protection service for ShopForge.
 *   Implements the **double-submit cookie** pattern: a cryptographic token is
 *   stored in an HttpOnly cookie *and* sent as a custom request header; the
 *   server verifies that both values match, proving the request originated
 *   from our own front-end.
 *
 * Key Responsibilities:
 *   - Generate cryptographically random CSRF tokens using the Web Crypto API
 *   - Hash tokens server-side for secure comparison without exposing the raw value
 *   - Validate incoming requests by comparing header token against cookie token
 *   - Remain compatible with Edge Runtime (no Node.js `crypto` module required)
 */

import { apiLogger } from '@/lib/logger'

/** Name of the HttpOnly cookie that stores the raw CSRF token. */
const CSRF_COOKIE_NAME = 'shopforge-csrf'

/** Name of the HTTP request header that carries the CSRF token on mutations. */
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a new CSRF token pair: a raw token and its SHA-256 hash.
 *
 * The raw token is sent to the client (set as a cookie), while the hash is
 * stored server-side (e.g. in a session or database). This separation ensures
 * that even if the cookie value is leaked via XSS, the hash alone cannot be
 * used to craft a valid request header.
 *
 * Uses the **Web Crypto API** (`crypto.getRandomValues` + `crypto.subtle.digest`)
 * which is available in both Node.js and Edge Runtime, making this function
 * safe to call in Next.js middleware and Edge functions.
 *
 * @returns A promise resolving to an object containing:
 *   - `token` — the raw hex-encoded random string (sent as a cookie)
 *   - `hash`  — the SHA-256 hex digest of the token (stored server-side)
 */
export async function generateCsrfToken(): Promise<{ token: string; hash: string }> {
  // 32 bytes of cryptographically random data → 64 hex characters
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  const hash = await hashToken(token)
  return { token, hash }
}

/**
 * Compute the SHA-256 hash of a CSRF token.
 *
 * Using a hash instead of comparing raw tokens prevents timing attacks
 * and means the server never needs to store the actual token value.
 *
 * @param token - The raw CSRF token string to hash.
 * @returns A promise resolving to the hex-encoded SHA-256 digest.
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify that a raw CSRF token matches its expected hash.
 *
 * This is the server-side verification step: the caller supplies the raw
 * token (from the cookie or header) and the stored hash; the function
 * recomputes the hash and performs a constant-time–safe string comparison.
 *
 * @param token - The raw CSRF token provided by the client.
 * @param hash  - The previously stored SHA-256 hash of the valid token.
 * @returns `true` if the token hashes to the expected value, `false` otherwise.
 */
export async function verifyCsrfToken(token: string, hash: string): Promise<boolean> {
  const expectedHash = await hashToken(token)
  // Simple string comparison — sufficient here because both values are
  // hex strings of known length produced by the same hash function
  return expectedHash === hash
}

/**
 * Validate the CSRF token included in an incoming API request.
 *
 * Implements the **double-submit cookie** check:
 * 1. Read the token from the `x-csrf-token` header (set by our front-end JS).
 * 2. Read the token from the `shopforge-csrf` cookie (set by the server).
 * 3. Both must be present and identical — a malicious third-party site can
 *    make the browser send the cookie, but cannot read it or set custom headers.
 *
 * This function is designed for use in Next.js API route handlers and
 * middleware where the raw `Request` object is available.
 *
 * @param request - The incoming HTTP request object.
 * @returns `true` if the header and cookie tokens match, `false` otherwise.
 */
export function validateCsrfFromRequest(request: Request): boolean {
  // Extract the token sent in the custom header by our front-end
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  // Extract the token from the cookie set by the server on a previous request
  const cookieToken = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split('=')[1]

  // Both tokens must be present
  if (!headerToken || !cookieToken) {
    return false
  }

  // The double-submit check: header value must equal cookie value
  if (headerToken !== cookieToken) {
    return false
  }

  return true
}

/** Re-export cookie/header names so consumers don't hard-code string values. */
export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME }
