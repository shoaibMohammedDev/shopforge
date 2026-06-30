// ============================================================================
// ShopForge - Coupon DTOs (Data Transfer Objects)
// ============================================================================

export interface ValidateCouponRequestDTO {
  code: string
  subtotal: number
}

export interface CreateCouponRequestDTO {
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  minPurchase?: number
  maxDiscount?: number | null
  usageLimit?: number | null
  perUserLimit?: number | null
  startsAt?: string | null
  expiresAt?: string | null
}

export interface CouponDTO {
  id: string
  code: string
  type: string
  value: number
  minPurchase: number
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  perUserLimit: number | null
  isActive: boolean
  startsAt: string | null
  expiresAt: string | null
}

export interface CouponValidationDTO {
  valid: boolean
  coupon?: CouponDTO
  discountAmount?: number
  error?: string
}
