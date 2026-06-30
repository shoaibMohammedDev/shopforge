// ============================================================================
// File: coupon.dto.ts
// Description: Coupon Data Transfer Objects (DTOs) for ShopForge — typed interfaces
//              that define the shape of coupon validation requests, creation payloads,
//              and response data
// Key Responsibilities:
//   - Define the contract for coupon validation requests (code + cart subtotal)
//   - Define the contract for admin coupon creation with all configurable fields
//   - Define the coupon representation returned in API responses
//   - Define the validation result structure (valid/invalid + discount or error)
// ============================================================================

/**
 * Request payload for validating a coupon against the current cart.
 *
 * The `subtotal` is required so the service can enforce minimum purchase
 * requirements and calculate the correct discount amount.
 */
export interface ValidateCouponRequestDTO {
  /** The coupon code entered by the customer (case-sensitive) */
  code: string
  /** The cart's subtotal before any discounts are applied (in dollars) */
  subtotal: number
}

/**
 * Request payload for creating a new coupon (admin only).
 *
 * All monetary values are in dollars. Optional fields default to null
 * in the database when not provided, meaning "no restriction".
 */
export interface CreateCouponRequestDTO {
  /** Unique coupon code (e.g., "SUMMER20", "WELCOME50") */
  code: string
  /** Discount type: 'PERCENTAGE' applies a percentage, 'FIXED' applies a flat amount */
  type: 'PERCENTAGE' | 'FIXED'
  /** Discount value — for PERCENTAGE this is the percentage (e.g., 20 = 20%),
   *  for FIXED this is the dollar amount (e.g., 10 = $10 off) */
  value: number
  /** Minimum cart subtotal required to use this coupon (defaults to 0) */
  minPurchase?: number
  /** Maximum discount amount for PERCENTAGE coupons (caps the discount);
   *  null means no cap — a 50% coupon on a $1000 cart could discount $500 */
  maxDiscount?: number | null
  /** Total number of times this coupon can be used across all users;
   *  null means unlimited */
  usageLimit?: number | null
  /** Maximum number of times a single user can apply this coupon;
   *  null means unlimited per user */
  perUserLimit?: number | null
  /** ISO 8601 date string when the coupon becomes active (null = immediately) */
  startsAt?: string | null
  /** ISO 8601 date string when the coupon expires (null = never expires) */
  expiresAt?: string | null
}

/**
 * Coupon representation returned in API responses.
 *
 * This is a safe, serialisable view of a coupon record with all date fields
 * converted to ISO 8601 strings and all nullable fields explicitly typed.
 */
export interface CouponDTO {
  /** Unique coupon identifier (UUID) */
  id: string
  /** The coupon code (e.g., "SUMMER20") */
  code: string
  /** Discount type: 'PERCENTAGE' or 'FIXED' */
  type: string
  /** Discount value (percentage or fixed amount depending on type) */
  value: number
  /** Minimum cart subtotal required (in dollars) */
  minPurchase: number
  /** Maximum discount cap for percentage coupons (null = no cap) */
  maxDiscount: number | null
  /** Total usage limit across all users (null = unlimited) */
  usageLimit: number | null
  /** Number of times this coupon has been used so far */
  usedCount: number
  /** Per-user usage limit (null = unlimited per user) */
  perUserLimit: number | null
  /** Whether the coupon is currently active */
  isActive: boolean
  /** ISO 8601 date string when the coupon becomes active (null = immediately) */
  startsAt: string | null
  /** ISO 8601 date string when the coupon expires (null = never) */
  expiresAt: string | null
}

/**
 * Result of a coupon validation attempt.
 *
 * If `valid` is true, `coupon` and `discountAmount` are present.
 * If `valid` is false, `error` contains a human-readable reason.
 * This structure allows the frontend to display either the discount
 * or the specific rejection reason.
 */
export interface CouponValidationDTO {
  /** Whether the coupon passed all validation checks */
  valid: boolean
  /** The validated coupon data (present only when valid) */
  coupon?: CouponDTO
  /** The calculated discount amount in dollars (present only when valid) */
  discountAmount?: number
  /** Human-readable error message explaining why the coupon is invalid */
  error?: string
}
