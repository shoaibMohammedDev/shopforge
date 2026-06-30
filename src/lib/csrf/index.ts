// ============================================================================
// ShopForge - CSRF Protection Service
// Double-submit cookie pattern for API route protection
// Compatible with Edge Runtime (no Node.js crypto module)
// ============================================================================

import { apiLogger } from '@/lib/logger'

const CSRF_COOKIE_NAME = 'shopforge-csrf'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a new CSRF token pair (token + hash)
 * Uses Web Crypto API (available in Edge Runtime)
 */
export async function generateCsrfToken(): Promise<{ token: string; hash: string }> {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  const hash = await hashToken(token)
  return { token, hash }
}

/**
 * Hash a CSRF token for server-side comparison using Web Crypto API
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify a CSRF token against its hash
 */
export async function verifyCsrfToken(token: string, hash: string): Promise<boolean> {
  const expectedHash = await hashToken(token)
  return expectedHash === hash
}

/**
 * Validate CSRF token from request headers
 * For API routes that need CSRF protection (state-changing operations)
 */
export function validateCsrfFromRequest(request: Request): boolean {
  const headerToken = request.headers.get(CSRF_HEADER_NAME)
  const cookieToken = request.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith(`${CSRF_COOKIE_NAME}=`))
    ?.split('=')[1]

  if (!headerToken || !cookieToken) {
    return false
  }

  if (headerToken !== cookieToken) {
    return false
  }

  return true
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME }
