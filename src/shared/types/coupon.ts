/**
 * @file shared/types/coupon.ts
 * @description Coupon domain type definitions.
 */

/** Discount coupon with type, usage limits, and validity window. */
export interface CouponDisplay {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING'
  value: number
  minPurchase: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number | null
  startsAt: string | null
  expiresAt: string | null
  isActive: boolean
}
