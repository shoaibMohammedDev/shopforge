// ============================================================================
// ShopForge - Production Middleware
// Rate limiting, CSRF protection, security headers, API versioning, logging
// ============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateCsrfFromRequest } from '@/lib/csrf'
import { appConfig } from '@/lib/config'

// ---- Rate Limiting ----
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW = appConfig.rateLimit.windowMs
const RATE_LIMIT_MAX = appConfig.rateLimit.maxRequests

// Stricter rate limits for auth endpoints
const AUTH_RATE_LIMIT_MAX = 10
const authRateLimitStore = new Map<string, RateLimitEntry>()

function getRateLimitKey(request: NextRequest): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return ip
}

function checkRateLimit(
  key: string,
  store: Map<string, RateLimitEntry>,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: maxRequests - 1, resetAt }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

// ---- Route Definitions ----
const PROTECTED_ROUTES = ['/api/orders', '/api/addresses', '/api/users']
const ADMIN_ROUTES = ['/api/admin']
const AUTH_ROUTES = ['/api/auth']
const CSRF_PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    response.headers.set('Access-Control-Allow-Origin', appConfig.appUrl)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Request-ID')
    response.headers.set('Access-Control-Max-Age', '86400')
    return response
  }

  const rateLimitKey = getRateLimitKey(request)

  // ---- 1. API Versioning ----
  const apiVersion = 'v1'

  // ---- 2. Rate Limiting ----
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route))
  const rateResult = checkRateLimit(
    rateLimitKey,
    isAuthRoute ? authRateLimitStore : rateLimitStore,
    isAuthRoute ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW
  )

  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(isAuthRoute ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateResult.resetAt),
        },
      }
    )
  }

  // ---- 3. CSRF Protection for state-changing requests ----
  const needsCsrf =
    CSRF_PROTECTED_METHODS.includes(method) &&
    !isAuthRoute // Skip CSRF for auth routes (login/register have no session yet)

  if (needsCsrf) {
    const csrfValid = validateCsrfFromRequest(request)
    if (!csrfValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'CSRF token validation failed',
          code: 'CSRF_ERROR',
        },
        { status: 403 }
      )
    }
  }

  // ---- 4. CSRF Token Cookie ----
  // Set CSRF cookie on API requests if not present (double-submit pattern)
  const response = NextResponse.next()
  const csrfCookie = request.cookies.get('shopforge-csrf')
  if (!csrfCookie) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36) + Math.random().toString(36).substring(2)
    response.cookies.set('shopforge-csrf', token, {
      httpOnly: false, // Must be readable by JS for header submission
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })
  }

  // ---- 5. Security Headers ----
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Allow embedding in preview iframe
  // response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  )
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' https:; connect-src 'self' https: wss:; frame-ancestors 'self' https://*.space-z.ai;"
  )

  // ---- 5. Rate Limit Headers ----
  response.headers.set('X-RateLimit-Limit', String(isAuthRoute ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX))
  response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining))
  response.headers.set('X-RateLimit-Reset', String(rateResult.resetAt))

  // ---- 6. API Version Header ----
  response.headers.set('X-API-Version', apiVersion)

  // ---- 7. Request ID for tracing ----
  const requestId = request.headers.get('x-request-id') || 
    Math.random().toString(36).substring(2) + Date.now().toString(36)
  response.headers.set('X-Request-ID', requestId)

  // ---- 8. CORS Headers for API routes ----
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', appConfig.appUrl)
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Request-ID')
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
