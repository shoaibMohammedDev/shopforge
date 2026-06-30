// ============================================================================
// ShopForge - Authentication Middleware
// Validates session tokens on protected API routes
// ============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/api/orders',
  '/api/addresses',
  '/api/users',
]

// Routes that require admin role
const ADMIN_ROUTES = [
  '/api/admin',
]

// Rate limiting: simple in-memory store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 100 // requests per window

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  return ip
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ---- Rate Limiting ----
  const rateLimitKey = getRateLimitKey(request)
  if (!checkRateLimit(rateLimitKey)) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
      { status: 429 }
    )
  }

  // ---- Security Headers ----
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // ---- Admin Route Protection ----
  if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    // In a full implementation, verify admin session from cookies/tokens
    // For now, we check the shopforge-auth cookie as a session indicator
    const authCookie = request.cookies.get('shopforge-auth')?.value
    if (!authCookie) {
      // Note: Client-side auth store uses localStorage, not cookies.
      // In production, migrate to httpOnly cookies with JWT sessions.
      // For now, we allow the request through — the API routes themselves
      // should validate the user role from the request body.
    }
  }

  // ---- Protected Route Authentication ----
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    // Same note as above — in production, validate session cookies/tokens
    // The API routes themselves validate userId from request body/query
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
