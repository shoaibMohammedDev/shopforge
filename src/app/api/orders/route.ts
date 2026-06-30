// ============================================================================
// ShopForge - Orders API Route (Service Layer Pattern)
// GET / POST /api/orders - Order management with service layer
// ============================================================================

import { NextResponse } from 'next/server'
import { orderService } from '@/features/orders/services/order.service'
import { couponService } from '@/features/coupons/services/coupon.service'
import { createOrderSchema } from '@/lib/validators'
import { handleApiError, ValidationError } from '@/lib/errors'

// GET /api/orders - Get user's orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const orderId = searchParams.get('orderId')

    if (orderId) {
      const order = await orderService.getOrder(orderId, userId || undefined)
      return NextResponse.json({ success: true, data: order })
    }

    if (!userId) {
      throw new ValidationError('userId is required')
    }

    const orders = await orderService.getUserOrders(userId)
    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/orders - Create order
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      const fields: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.join('.'))
        if (!fields[key]) fields[key] = []
        fields[key].push(issue.message)
      }
      throw new ValidationError('Invalid order data', fields)
    }

    // Delegate to service layer
    const order = await orderService.createOrder(parsed.data)
    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
