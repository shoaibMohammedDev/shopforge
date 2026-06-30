// ============================================================================
// ShopForge - Coupons API Route (Service Layer Pattern)
// GET /api/coupons - Validate coupon code
// ============================================================================

import { NextResponse } from 'next/server'
import { couponService } from '@/features/coupons/services/coupon.service'
import { couponQuerySchema } from '@/lib/validators'
import { handleApiError, ValidationError } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Validate input
    const parsed = couponQuerySchema.safeParse(params)
    if (!parsed.success) {
      throw new ValidationError('Invalid coupon query parameters')
    }

    // Delegate to service layer
    const result = await couponService.validateCoupon({
      code: parsed.data.code,
      subtotal: parsed.data.subtotal,
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
