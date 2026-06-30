/**
 * @file route.ts (Auth API)
 * @description Authentication API route handler for the ShopForge e-commerce platform.
 *              Provides a unified POST endpoint for all authentication operations:
 *              login, register, token verification, and password change.
 *              Uses a service-layer pattern — business logic is delegated to
 *              the auth service, and input validation is handled by Zod schemas.
 *
 * @endpoint POST /api/auth — Login, Register, Verify token, or Change password
 *
 * @auth None — This endpoint is itself the authentication gateway.
 *              The "verify" action requires a valid token in the request body.
 */

import { NextResponse } from 'next/server'
import { authService } from "@/modules/auth/services/auth.service"
import { authSchema } from "@/shared/validators"
import { handleApiError, ValidationError } from "@/shared/lib/errors"
import { apiLogger } from "@/shared/lib/logger"

/**
 * Handles POST requests for authentication operations.
 *
 * @description Processes authentication requests based on the `action` field
 *              in the request body. Validates all input using the Zod
 *              `authSchema` before delegating to the auth service.
 *              Supports four actions:
 *              - **login**: Authenticates a user with email/password, returns a JWT token.
 *              - **register**: Creates a new user account and returns a JWT token.
 *              - **verify**: Validates an existing JWT token and returns user info.
 *              - **change-password**: Updates the password for an authenticated user.
 *
 * @param request - The incoming Next.js Request object with JSON body.
 *
 * @bodyParam action          - The auth operation to perform. One of: "login", "register", "verify", "change-password".
 * @bodyParam email           - User email address (required for login, register).
 * @bodyParam password        - User password (required for login, register, change-password).
 * @bodyParam name            - Display name (required for register).
 * @bodyParam token           - JWT token (required for verify).
 * @bodyParam currentPassword - Current password (required for change-password).
 * @bodyParam newPassword     - New password (required for change-password).
 *
 * @returns JSON response with success flag and auth data.
 *
 * @response 200 - Application/json — Successful login, verify, or password change.
 *   { "success": true, "data": { "token": "...", "user": { ... } } }
 * @response 201 - Application/json — Successful registration.
 *   { "success": true, "data": { "token": "...", "user": { ... } } }
 * @response 400 - Application/json — Validation error (missing/invalid fields).
 * @response 401 - Application/json — Invalid credentials (login).
 * @response 409 - Application/json — Email already exists (register).
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Login request
 * POST /api/auth
 * { "action": "login", "email": "user@example.com", "password": "secret123" }
 *
 * // Register request
 * POST /api/auth
 * { "action": "register", "email": "new@example.com", "password": "secret123", "name": "Jane Doe" }
 *
 * // Verify token request
 * POST /api/auth
 * { "action": "verify", "token": "eyJhbGciOiJIUzI1NiIs..." }
 *
 * // Change password request
 * POST /api/auth
 * { "action": "change-password", "email": "user@example.com", "currentPassword": "old", "newPassword": "new" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input with Zod schema — ensures all required fields are present
    // and correctly typed before any business logic runs
    const parsed = authSchema.safeParse(body)
    if (!parsed.success) {
      // Transform Zod error issues into a structured field-error map
      const fields: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.join('.'))
        if (!fields[key]) fields[key] = []
        fields[key].push(issue.message)
      }
      throw new ValidationError('Invalid input', fields)
    }

    // Delegate to service layer — handles JWT generation, password hashing,
    // token verification, and all auth business logic
    const result = await authService.handleAuthRequest(parsed.data as any)

    // Return 201 for registration (resource created), 200 for all other actions
    const status = parsed.data.action === 'register' ? 201 : 200
    return NextResponse.json({ success: true, data: result }, { status })
  } catch (error) {
    return handleApiError(error)
  }
}
