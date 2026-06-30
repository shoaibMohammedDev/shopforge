// ============================================================================
// ShopForge - Admin API Route (Service Layer Pattern)
// All admin operations delegate to services
// ============================================================================

import { NextResponse } from 'next/server'
import { adminService } from '@/features/admin/services/admin.service'
import { orderService } from '@/features/orders/services/order.service'
import { couponService } from '@/features/coupons/services/coupon.service'
import { productService } from '@/features/products/services/product.service'
import { handleApiError } from '@/lib/errors'
import { db } from '@/lib/db'

// GET /api/admin - Admin dashboard data
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'

    switch (action) {
      case 'stats': {
        const stats = await adminService.getDashboardStats()
        return NextResponse.json(stats)
      }
      case 'products': {
        const products = await adminService.getProducts()
        return NextResponse.json(products)
      }
      case 'orders': {
        const status = searchParams.get('status')
        const result = await orderService.getAllOrders({ status: status || undefined })
        return NextResponse.json(result.items)
      }
      case 'customers': {
        const customers = await adminService.getCustomers()
        return NextResponse.json(customers)
      }
      case 'coupons': {
        const coupons = await adminService.getCoupons()
        return NextResponse.json(coupons)
      }
      case 'reviews': {
        const reviews = await adminService.getReviews()
        return NextResponse.json(reviews)
      }
      case 'banners': {
        const banners = await adminService.getBanners()
        return NextResponse.json(banners)
      }
      case 'settings': {
        const settings = await adminService.getSettings()
        return NextResponse.json(settings)
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return handleApiError(error)
  }
}

// PUT /api/admin - Update operations
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { action, id, data } = body

    switch (action) {
      case 'update-order-status': {
        const order = await orderService.updateOrderStatus({
          orderId: id,
          status: data.status,
          message: data.message,
        })
        return NextResponse.json(order)
      }
      case 'update-product': {
        const product = await db.product.update({ where: { id }, data })
        return NextResponse.json(product)
      }
      case 'toggle-user': {
        const user = await adminService.toggleUser(id, data.isActive)
        return NextResponse.json(user)
      }
      case 'approve-review': {
        const review = await adminService.approveReview(id, data.isApproved)
        return NextResponse.json(review)
      }
      case 'update-settings': {
        await adminService.updateSettings(data)
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/admin - Create operations
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'create-coupon': {
        const coupon = await couponService.createCoupon(data)
        return NextResponse.json(coupon, { status: 201 })
      }
      case 'create-banner': {
        const banner = await db.banner.create({ data })
        return NextResponse.json(banner, { status: 201 })
      }
      case 'create-product': {
        const product = await productService.createProduct(data)
        return NextResponse.json(product, { status: 201 })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE /api/admin - Delete operations
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    switch (action) {
      case 'delete-coupon': {
        await couponService.deleteCoupon(id!)
        return NextResponse.json({ success: true })
      }
      case 'delete-banner': {
        await db.banner.delete({ where: { id: id! } })
        return NextResponse.json({ success: true })
      }
      case 'delete-review': {
        await db.review.delete({ where: { id: id! } })
        return NextResponse.json({ success: true })
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
