// ============================================================================
// File: coupon.service.ts
// Description: Coupon validation and management service for ShopForge
// Key Responsibilities:
//   - Validate coupon codes against multiple business rules (active, not expired,
//     within date window, under usage limit, meets minimum purchase)
//   - Calculate discount amounts for both PERCENTAGE and FIXED coupon types
//   - Enforce maximum discount caps on percentage-based coupons
//   - Create new coupons with duplicate-code detection (admin)
//   - Delete existing coupons (admin)
// ============================================================================

import { db } from "@/infrastructure/database"
import { apiLogger } from "@/shared/lib/logger"
import { NotFoundError, ValidationError } from "@/shared/lib/errors"
import type { ValidateCouponRequestDTO, CouponValidationDTO, CreateCouponRequestDTO, CouponDTO } from '../dto/coupon.dto'

/**
 * CouponService — business logic for coupon validation and administration.
 *
 * The validation flow is designed as a series of early-return checks so that
 * the first failing rule determines the error message shown to the customer.
 * Only if all checks pass does the discount calculation proceed.
 */
class CouponService {
  /**
   * Validate a coupon code and calculate the resulting discount amount.
   *
   * Validation checks (in order):
   *   1. Coupon exists in the database
   *   2. Coupon is marked as active
   *   3. Coupon has not expired (expiresAt is in the future)
   *   4. Coupon has started (startsAt is in the past)
   *   5. Coupon has not reached its total usage limit
   *   6. Cart subtotal meets the minimum purchase requirement
   *
   * Discount calculation:
   *   - PERCENTAGE: (subtotal × value / 100), capped at maxDiscount if set
   *   - FIXED: min(value, subtotal) — discount cannot exceed the subtotal
   *
   * @param {ValidateCouponRequestDTO} request - Contains the coupon code and cart subtotal
   * @param {string} request.code - The coupon code to validate
   * @param {number} request.subtotal - The cart's subtotal before discount
   * @returns {Promise<CouponValidationDTO>} Validation result with discount amount or error message
   */
  async validateCoupon(request: ValidateCouponRequestDTO): Promise<CouponValidationDTO> {
    return apiLogger.measure('validateCoupon', async () => {
      const coupon = await db.coupon.findUnique({ where: { code: request.code } })

      // Check 1: Coupon code must exist in the database
      if (!coupon) {
        return { valid: false, error: 'Invalid coupon code' }
      }

      // Check 2: Coupon must be currently active
      if (!coupon.isActive) {
        return { valid: false, error: 'This coupon is no longer active' }
      }

      const now = new Date()
      // Check 3: Coupon must not have passed its expiration date
      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        return { valid: false, error: 'This coupon has expired' }
      }

      // Check 4: Coupon must have reached its start date (if set)
      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return { valid: false, error: 'This coupon is not yet active' }
      }

      // Check 5: Total usage must not exceed the configured limit
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, error: 'This coupon has reached its usage limit' }
      }

      // Check 6: Cart subtotal must meet the minimum purchase threshold
      if (request.subtotal < coupon.minPurchase) {
        return {
          valid: false,
          error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required`,
        }
      }

      // Calculate discount based on coupon type
      let discountAmount = 0
      if (coupon.type === 'PERCENTAGE') {
        // Percentage discount: apply the percentage to the subtotal
        discountAmount = (request.subtotal * coupon.value) / 100
        // Cap the discount at maxDiscount if the coupon has a ceiling
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount)
        }
      } else {
        // Fixed discount: apply the flat amount, but never exceed the subtotal
        // (e.g., a $50 coupon on a $30 cart should only discount $30)
        discountAmount = Math.min(coupon.value, request.subtotal)
      }

      // Map the database record to the CouponDTO for safe API transmission
      const couponDto: CouponDTO = {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minPurchase: coupon.minPurchase,
        maxDiscount: coupon.maxDiscount,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        perUserLimit: coupon.perUserLimit,
        isActive: coupon.isActive,
        startsAt: coupon.startsAt?.toISOString() || null,
        expiresAt: coupon.expiresAt?.toISOString() || null,
      }

      return { valid: true, coupon: couponDto, discountAmount }
    })
  }

  /**
   * Create a new coupon (admin only).
   *
   * Validates that the coupon code is unique before creating the record.
   * The code is stored as-is (case-sensitive) — consumers should
   * normalise codes to uppercase before calling this method if needed.
   *
   * @param {CreateCouponRequestDTO} data - The coupon creation payload
   * @param {string} data.code - Unique coupon code (e.g., "SUMMER20")
   * @param {'PERCENTAGE' | 'FIXED'} data.type - Discount type
   * @param {number} data.value - Discount value (percentage or fixed amount)
   * @returns {Promise<Record<string, unknown>>} The newly created coupon record
   * @throws {ValidationError} If a coupon with the same code already exists
   */
  async createCoupon(data: CreateCouponRequestDTO): Promise<Record<string, unknown>> {
    // Check for duplicate code — coupon codes must be globally unique
    const existing = await db.coupon.findUnique({ where: { code: data.code } })
    if (existing) {
      throw new ValidationError('A coupon with this code already exists')
    }

    const coupon = await db.coupon.create({ data })
    apiLogger.info('Coupon created', { couponId: coupon.id, code: coupon.code })
    return coupon as unknown as Record<string, unknown>
  }

  /**
   * Delete a coupon by ID (admin only).
   *
   * Performs an existence check before deletion to provide a meaningful
   * error message rather than relying on Prisma's generic not-found error.
   *
   * @param {string} couponId - The ID of the coupon to delete
   * @returns {Promise<void>}
   * @throws {NotFoundError} If the coupon doesn't exist
   */
  async deleteCoupon(couponId: string): Promise<void> {
    const existing = await db.coupon.findUnique({ where: { id: couponId } })
    if (!existing) {
      throw new NotFoundError('Coupon')
    }
    await db.coupon.delete({ where: { id: couponId } })
    apiLogger.info('Coupon deleted', { couponId })
  }
}

/** Singleton instance of CouponService for use across the application */
export const couponService = new CouponService()
