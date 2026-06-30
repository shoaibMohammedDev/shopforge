/**
 * @file errors.ts
 * @description Custom error classes and API response helpers for ShopForge.
 *   Provides a hierarchy of typed error classes that map to standard HTTP
 *   status codes, along with helper functions that convert errors into
 *   consistent JSON responses and Next.js `NextResponse` objects.
 *
 * Key Responsibilities:
 *   - Define typed error classes (ValidationError, AuthenticationError, etc.)
 *     that carry HTTP status codes and machine-readable error codes
 *   - Provide `successResponse` / `errorResponse` helpers for the standard
 *     `{ success, data } | { success, error, code }` envelope
 *   - Handle Prisma-specific errors (unique constraint violations, missing
 *     records, validation errors) and translate them into appropriate HTTP responses
 *   - Prevent internal error details from leaking in production responses
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

/**
 * Base application error class.
 *
 * All custom errors extend this class so that `handleApiError` can detect
 * them via `instanceof` and automatically map them to the correct HTTP
 * status code.
 *
 * The `isOperational` flag distinguishes errors that are part of normal
 * application flow (e.g. "not found") from unexpected programming bugs.
 * This distinction is useful for global error handlers that may want to
 * alert on-call engineers only for non-operational errors.
 */
export class AppError extends Error {
  /** HTTP status code to return in the response. */
  public readonly statusCode: number
  /** Machine-readable error code for front-end error handling. */
  public readonly code: string
  /** `true` if this error is an expected, handled business-logic error. */
  public readonly isOperational: boolean

  /**
   * @param message      - Human-readable error description (shown in API responses).
   * @param statusCode   - HTTP status code (defaults to 500).
   * @param code         - Machine-readable error code (defaults to "INTERNAL_ERROR").
   * @param isOperational - Whether this is a handled business-logic error (defaults to true).
   */
  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    // Restore the prototype chain that is broken by extending built-in classes
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * 400 Bad Request — raised when request input fails validation.
 *
 * Carries an optional `fields` map where each key is a form field name
 * and the value is an array of error messages for that field. This enables
 * front-end forms to highlight the exact fields that need correction.
 */
export class ValidationError extends AppError {
  /** Per-field validation error messages, keyed by field name. */
  public readonly fields?: Record<string, string[]>

  /**
   * @param message - Overview of what went wrong (defaults to "Validation failed").
   * @param fields  - Optional map of field names → error message arrays.
   */
  constructor(message: string = 'Validation failed', fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR')
    this.fields = fields
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * 401 Unauthorized — raised when the request lacks valid authentication
 * credentials (missing token, expired session, etc.).
 */
export class AuthenticationError extends AppError {
  /**
   * @param message - Description of the authentication failure (defaults to "Authentication required").
   */
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * 403 Forbidden — raised when the authenticated user does not have
 * sufficient permissions to perform the requested action.
 *
 * Distinct from `AuthenticationError` (401): the user *is* identified but
 * lacks the required role or privilege.
 */
export class AuthorizationError extends AppError {
  /**
   * @param message - Description of the permission denial (defaults to "Insufficient permissions").
   */
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

/**
 * 404 Not Found — raised when the requested resource does not exist.
 *
 * The constructor accepts the resource type name so the error message is
 * descriptive (e.g. "Product not found" instead of "Resource not found").
 */
export class NotFoundError extends AppError {
  /**
   * @param resource - Name of the resource type that was not found (defaults to "Resource").
   */
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * 409 Conflict — raised when the request would create a duplicate resource
 * or violate a uniqueness constraint (e.g. email already registered).
 */
export class ConflictError extends AppError {
  /**
   * @param message - Description of the conflict (defaults to "Resource already exists").
   */
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * 429 Too Many Requests — raised when the client has exceeded the
 * configured rate limit for the current time window.
 */
export class RateLimitError extends AppError {
  /**
   * @param message - Throttling message (defaults to a polite retry-later notice).
   */
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

// ============================================================================
// API Response Helpers
// ============================================================================

/**
 * Standard error envelope returned by all API routes on failure.
 * The `success: false` discriminant allows front-end code to narrow the type.
 */
export interface ApiErrorResponse {
  /** Always `false` for error responses. */
  success: false
  /** Human-readable error message safe to display to the user. */
  error: string
  /** Machine-readable error code for programmatic handling. */
  code: string
  /** Optional per-field error details (populated by `ValidationError`). */
  details?: Record<string, string[]>
}

/**
 * Standard success envelope returned by all API routes on success.
 * The `success: true` discriminant allows front-end code to narrow the type.
 */
export interface ApiSuccessResponse<T> {
  /** Always `true` for success responses. */
  success: true
  /** The response payload. */
  data: T
}

/**
 * Discriminated union of success and error response shapes.
 * The `success` field acts as the type guard for consumers.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Create a standardised success response envelope.
 *
 * @typeParam T - Type of the data payload.
 * @param data - The response payload to wrap.
 * @returns An `ApiSuccessResponse<T>` with `success: true`.
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data }
}

/**
 * Create a standardised error response envelope.
 *
 * For `AppError` subclasses, the error's `code` and `message` are preserved.
 * For unexpected `Error` instances, a generic message is returned to avoid
 * leaking stack traces or internal details in production.
 *
 * @param error - The error to translate into a response.
 * @returns An `ApiErrorResponse` with `success: false`.
 */
export function errorResponse(error: AppError | Error): ApiErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      // Include per-field details when the error is a ValidationError with fields
      ...(error instanceof ValidationError && error.fields
        ? { details: error.fields }
        : {}),
    }
  }

  // Don't leak internal error details in production
  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  }
}

/**
 * Central error handler for Next.js API route handlers.
 *
 * Accepts any thrown value, inspects its type, and returns the appropriate
 * JSON `NextResponse` with the correct HTTP status code. Handles:
 *
 * - **AppError** subclasses → mapped to their `statusCode`
 * - **Prisma P2002** (unique constraint violation) → 409 Conflict
 * - **Prisma P2025** (record not found) → 404 Not Found
 * - **Prisma validation errors** → 400 Bad Request
 * - **Unknown errors** → 500 Internal Server Error (generic message)
 *
 * All errors are logged with full details (including stack traces) for
 * post-incident debugging, but the HTTP response body never exposes
 * internal implementation details.
 *
 * @param error - The value thrown in the route handler.
 * @returns A `NextResponse` with the appropriate status code and JSON body.
 */
export function handleApiError(error: unknown): NextResponse {
  // Log the full error for debugging — includes stack trace in non-production
  console.error('[API Error]', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  })

  // Known application errors — use their built-in status code and message
  if (error instanceof AppError) {
    return NextResponse.json(errorResponse(error), { status: error.statusCode })
  }

  // Prisma unique constraint violation (code P2002)
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        errorResponse(new ConflictError('A record with this data already exists')),
        { status: 409 }
      )
    }
    // Prisma record not found (code P2025)
    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse(new NotFoundError()),
        { status: 404 }
      )
    }
  }

  // Prisma validation error — the query parameters or data shape was invalid
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      errorResponse(new ValidationError('Invalid data provided')),
      { status: 400 }
    )
  }

  // Unknown errors — return 500 without leaking details
  return NextResponse.json(
    errorResponse(new Error()),
    { status: 500 }
  )
}
