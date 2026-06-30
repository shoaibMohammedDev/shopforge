// ============================================================================
// ShopForge - Coupon Service
// Business logic for coupon validation and management
// ============================================================================

import { db } from '@/lib/db'
import { apiLogger } from '@/lib/logger'
import { NotFoundError, ValidationError } from '@/lib/errors'
import type { ValidateCouponRequestDTO, CouponValidationDTO, CreateCouponRequestDTO, CouponDTO } from '../dto/coupon.dto'

class CouponService {
  /**
   * Validate a coupon code and calculate discount
   */
  async validateCoupon(request: ValidateCouponRequestDTO): Promise<CouponValidationDTO> {
    return apiLogger.measure('validateCoupon', async () => {
      const coupon = await db.coupon.findUnique({ where: { code: request.code } })

      if (!coupon) {
        return { valid: false, error: 'Invalid coupon code' }
      }

      if (!coupon.isActive) {
        return { valid: false, error: 'This coupon is no longer active' }
      }

      const now = new Date()
      if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
        return { valid: false, error: 'This coupon has expired' }
      }

      if (coupon.startsAt && new Date(coupon.startsAt) > now) {
        return { valid: false, error: 'This coupon is not yet active' }
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, error: 'This coupon has reached its usage limit' }
      }

      if (request.subtotal < coupon.minPurchase) {
        return {
          valid: false,
          error: `Minimum purchase of $${coupon.minPurchase.toFixed(2)} required`,
        }
      }

      // Calculate discount
      let discountAmount = 0
      if (coupon.type === 'PERCENTAGE') {
        discountAmount = (request.subtotal * coupon.value) / 100
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, coupon.maxDiscount)
        }
      } else {
        discountAmount = Math.min(coupon.value, request.subtotal)
      }

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
   * Create a new coupon (admin)
   */
  async createCoupon(data: CreateCouponRequestDTO): Promise<Record<string, unknown>> {
    // Check for duplicate code
    const existing = await db.coupon.findUnique({ where: { code: data.code } })
    if (existing) {
      throw new ValidationError('A coupon with this code already exists')
    }

    const coupon = await db.coupon.create({ data })
    apiLogger.info('Coupon created', { couponId: coupon.id, code: coupon.code })
    return coupon as unknown as Record<string, unknown>
  }

  /**
   * Delete a coupon (admin)
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

export const couponService = new CouponService()
