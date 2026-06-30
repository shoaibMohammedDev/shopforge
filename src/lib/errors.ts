// ============================================================================
// ShopForge - Custom Error Classes
// ============================================================================

/**
 * Base application error with status code and error code
 */
export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

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
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * 400 Bad Request - Validation or input errors
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>

  constructor(message: string = 'Validation failed', fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR')
    this.fields = fields
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR')
    Object.setPrototypeOf(this, AuthenticationError.prototype)
  }
}

/**
 * 403 Forbidden - Insufficient permissions
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR')
    Object.setPrototypeOf(this, AuthorizationError.prototype)
  }
}

/**
 * 404 Not Found - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

/**
 * 409 Conflict - Duplicate resource
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * 429 Too Many Requests - Rate limiting
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

// ============================================================================
// API Response Helpers
// ============================================================================

export interface ApiErrorResponse {
  success: false
  error: string
  code: string
  details?: Record<string, string[]>
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data }
}

export function errorResponse(error: AppError | Error): ApiErrorResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
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
 * Handle API errors in route handlers
 */
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export function handleApiError(error: unknown): NextResponse {
  // Log the full error for debugging
  console.error('[API Error]', {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  })

  // Known application errors
  if (error instanceof AppError) {
    return NextResponse.json(errorResponse(error), { status: error.statusCode })
  }

  // Prisma unique constraint violation
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        errorResponse(new ConflictError('A record with this data already exists')),
        { status: 409 }
      )
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        errorResponse(new NotFoundError()),
        { status: 404 }
      )
    }
  }

  // Prisma validation error
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
