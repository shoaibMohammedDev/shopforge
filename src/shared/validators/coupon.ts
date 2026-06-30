/**
 * @file shared/validators/coupon.ts
 * @description Zod validation schemas for coupon payloads.
 */
import { z } from 'zod/v4'

export const couponQuerySchema = z.object({
  code: z.string().min(1), subtotal: z.coerce.number().min(0),
})

export const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().min(0),
  minPurchase: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
})
