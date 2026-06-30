/**
 * @file route.ts (Coupons API)
 * @description Coupon validation API route handler for the ShopForge e-commerce platform.
 *              Validates a coupon code against the current cart subtotal, checking
 *              for validity, expiration, usage limits, and minimum order requirements.
 *              Uses a service-layer pattern — validation logic is delegated to the
 *              coupon service.
 *
 * @endpoint GET /api/coupons — Validate a coupon code against a subtotal
 *
 * @auth None — Public endpoint; coupon validation does not require authentication.
 *              However, the coupon service may enforce per-user usage limits
 *              if a userId is provided.
 */

import { NextResponse } from 'next/server'
import { couponService } from "@/modules/coupons/services/coupon.service"
import { couponQuerySchema } from "@/shared/validators"
import { handleApiError, ValidationError } from "@/shared/lib/errors"

/**
 * Handles GET requests to validate a coupon code.
 *
 * @description Accepts a coupon code and cart subtotal as query parameters,
 *              validates them using the Zod `couponQuerySchema`, then delegates
 *              to the coupon service for business-rule validation. The service
 *              checks code existence, expiration dates, usage limits, minimum
 *              order amounts, and computes the discount amount.
 *
 * @param request - The incoming Next.js Request object.
 *
 * @queryParam code     - The coupon code to validate (string, required).
 * @queryParam subtotal - The cart subtotal before discount (number, required).
 *                         Must be a positive number.
 *
 * @returns JSON response with validation result and discount details.
 *
 * @response 200 - Application/json — Coupon is valid.
 *   { "valid": true, "code": "SAVE20", "type": "PERCENTAGE", "value": 20, "discountAmount": 25.00 }
 * @response 400 - Application/json — Validation error (missing/invalid params).
 * @response 404 - Application/json — Coupon not found or expired.
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Request
 * GET /api/coupons?code=SAVE20&subtotal=125.00
 *
 * // Response (valid coupon)
 * { "valid": true, "code": "SAVE20", "type": "PERCENTAGE", "value": 20, "discountAmount": 25.00 }
 *
 * // Response (invalid coupon)
 * { "valid": false, "error": "Coupon has expired" }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // Convert URL search params to a plain object for Zod validation
    const params = Object.fromEntries(searchParams.entries())

    // Validate input — ensures `code` is a non-empty string and `subtotal`
    // is a valid positive number before reaching the service layer
    const parsed = couponQuerySchema.safeParse(params)
    if (!parsed.success) {
      throw new ValidationError('Invalid coupon query parameters')
    }

    // Delegate to service layer — performs all business rule checks:
    // existence, expiration, usage count, minimum order, and discount calculation
    const result = await couponService.validateCoupon({
      code: parsed.data.code,
      subtotal: parsed.data.subtotal,
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
