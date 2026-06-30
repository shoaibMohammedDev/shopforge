/**
 * @file route.ts (Admin API)
 * @description Admin API route handler for the ShopForge e-commerce platform.
 *              Provides a centralized entry point for all administrative operations,
 *              including dashboard statistics, product/order/customer management,
 *              coupon/banner CRUD, review moderation, and store settings.
 *              Uses a service-layer pattern — all business logic is delegated
 *              to dedicated service classes.
 *
 * @endpoint GET    /api/admin — Retrieve admin data (stats, lists, settings)
 * @endpoint POST   /api/admin — Create resources (coupons, banners, products)
 * @endpoint PUT    /api/admin — Update resources (orders, products, users, reviews, settings)
 * @endpoint DELETE /api/admin — Delete resources (coupons, banners, reviews)
 *
 * @auth Admin — All endpoints require admin-level authentication.
 *               (Enforcement is handled by middleware/service layer.)
 */

import { NextResponse } from 'next/server'
import { adminService } from "@/modules/admin/services/admin.service"
import { orderService } from "@/modules/orders/services/order.service"
import { couponService } from "@/modules/coupons/services/coupon.service"
import { productService } from "@/modules/products/services/product.service"
import { handleApiError } from "@/shared/lib/errors"
import { db } from "@/infrastructure/database"

/**
 * Handles GET requests for admin data retrieval.
 *
 * @description Routes to the appropriate service method based on the `action`
 *              query parameter. Returns dashboard statistics, product listings,
 *              order lists, customer data, coupons, reviews, banners, or settings.
 *
 * @param request - The incoming Next.js Request object.
 *
 * @queryParam action - The admin action to perform. One of:
 *   - "stats"     (default) — Dashboard statistics (revenue, orders, users, etc.)
 *   - "products"           — List all products for admin management
 *   - "orders"             — List orders; optionally filter by `status` query param
 *   - "customers"          — List all customers
 *   - "coupons"            — List all coupons
 *   - "reviews"            — List all reviews (for moderation)
 *   - "banners"            — List all banners
 *   - "settings"           — Retrieve store settings
 * @queryParam status - (Optional) Filter orders by status when action is "orders".
 *
 * @returns JSON response with the requested data.
 *
 * @response 200 - Application/json — Data payload varies by action.
 * @response 400 - Application/json — Invalid action parameter.
 *   { "error": "Invalid action" }
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Request
 * GET /api/admin?action=stats
 *
 * // Response
 * { "totalRevenue": 125000, "totalOrders": 320, ... }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // Default to 'stats' if no action is specified
    const action = searchParams.get('action') || 'stats'

    switch (action) {
      // Dashboard statistics — total revenue, order count, user count, etc.
      case 'stats': {
        const stats = await adminService.getDashboardStats()
        return NextResponse.json(stats)
      }
      // All products for admin management table
      case 'products': {
        const products = await adminService.getProducts()
        return NextResponse.json(products)
      }
      // Orders list, optionally filtered by status (e.g. "PENDING", "SHIPPED")
      case 'orders': {
        const status = searchParams.get('status')
        const result = await orderService.getAllOrders({ status: status || undefined })
        return NextResponse.json(result.items)
      }
      // Customer list with account details
      case 'customers': {
        const customers = await adminService.getCustomers()
        return NextResponse.json(customers)
      }
      // All coupons for admin management
      case 'coupons': {
        const coupons = await adminService.getCoupons()
        return NextResponse.json(coupons)
      }
      // Reviews awaiting moderation
      case 'reviews': {
        const reviews = await adminService.getReviews()
        return NextResponse.json(reviews)
      }
      // Banner carousel management
      case 'banners': {
        const banners = await adminService.getBanners()
        return NextResponse.json(banners)
      }
      // Store settings (shipping rates, tax config, etc.)
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

/**
 * Handles PUT requests for admin update operations.
 *
 * @description Routes to the appropriate service method based on the `action`
 *              field in the request body. Supports updating order status,
 *              product details, user active/inactive state, review approval,
 *              and store settings.
 *
 * @param request - The incoming Next.js Request object with JSON body.
 *
 * @bodyParam action - The update action to perform. One of:
 *   - "update-order-status" — Change an order's status (e.g. PENDING → SHIPPED)
 *   - "update-product"      — Update product fields
 *   - "toggle-user"         — Activate or deactivate a user account
 *   - "approve-review"      — Approve or reject a review
 *   - "update-settings"     — Update store settings
 * @bodyParam id   - The ID of the resource to update (string).
 * @bodyParam data - An object containing the fields to update (varies by action).
 *
 * @returns JSON response with the updated resource.
 *
 * @response 200 - Application/json — Updated resource data.
 * @response 400 - Application/json — Invalid action parameter.
 *   { "error": "Invalid action" }
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Request
 * PUT /api/admin
 * { "action": "update-order-status", "id": "ord_123", "data": { "status": "SHIPPED", "message": "Shipped via FedEx" } }
 *
 * // Response
 * { "id": "ord_123", "status": "SHIPPED", ... }
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { action, id, data } = body

    switch (action) {
      // Transition an order to a new status with an optional message
      case 'update-order-status': {
        const order = await orderService.updateOrderStatus({
          orderId: id,
          status: data.status,
          message: data.message,
        })
        return NextResponse.json(order)
      }
      // Update product fields directly via Prisma
      case 'update-product': {
        const product = await db.product.update({ where: { id }, data })
        return NextResponse.json(product)
      }
      // Toggle user between active and inactive states
      case 'toggle-user': {
        const user = await adminService.toggleUser(id, data.isActive)
        return NextResponse.json(user)
      }
      // Approve or reject a user-submitted review
      case 'approve-review': {
        const review = await adminService.approveReview(id, data.isApproved)
        return NextResponse.json(review)
      }
      // Persist store-wide settings changes
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

/**
 * Handles POST requests for admin create operations.
 *
 * @description Routes to the appropriate service method based on the `action`
 *              field in the request body. Supports creating coupons, banners,
 *              and products.
 *
 * @param request - The incoming Next.js Request object with JSON body.
 *
 * @bodyParam action - The create action to perform. One of:
 *   - "create-coupon"  — Create a new discount coupon
 *   - "create-banner"  — Create a new homepage banner
 *   - "create-product" — Create a new product listing
 * @bodyParam data - An object containing the resource fields (varies by action).
 *
 * @returns JSON response with the newly created resource.
 *
 * @response 201 - Application/json — Created resource data.
 * @response 400 - Application/json — Invalid action parameter.
 *   { "error": "Invalid action" }
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Request
 * POST /api/admin
 * { "action": "create-coupon", "data": { "code": "SAVE20", "type": "PERCENTAGE", "value": 20 } }
 *
 * // Response (201)
 * { "id": "coup_456", "code": "SAVE20", "type": "PERCENTAGE", "value": 20, ... }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      // Create a new discount coupon via coupon service
      case 'create-coupon': {
        const coupon = await couponService.createCoupon(data)
        return NextResponse.json(coupon, { status: 201 })
      }
      // Create a new homepage banner directly via Prisma
      case 'create-banner': {
        const banner = await db.banner.create({ data })
        return NextResponse.json(banner, { status: 201 })
      }
      // Create a new product listing via product service
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

/**
 * Handles DELETE requests for admin delete operations.
 *
 * @description Routes to the appropriate service or Prisma call based on the
 *              `action` query parameter. Supports deleting coupons, banners,
 *              and reviews.
 *
 * @param request - The incoming Next.js Request object.
 *
 * @queryParam action - The delete action to perform. One of:
 *   - "delete-coupon" — Delete a coupon by ID
 *   - "delete-banner" — Delete a banner by ID
 *   - "delete-review" — Delete a review by ID
 * @queryParam id     - The ID of the resource to delete (string, required).
 *
 * @returns JSON response confirming deletion.
 *
 * @response 200 - Application/json — Deletion confirmed.
 *   { "success": true }
 * @response 400 - Application/json — Invalid action parameter.
 *   { "error": "Invalid action" }
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Request
 * DELETE /api/admin?action=delete-coupon&id=coup_456
 *
 * // Response
 * { "success": true }
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    switch (action) {
      // Remove a coupon from the system
      case 'delete-coupon': {
        await couponService.deleteCoupon(id!)
        return NextResponse.json({ success: true })
      }
      // Remove a homepage banner
      case 'delete-banner': {
        await db.banner.delete({ where: { id: id! } })
        return NextResponse.json({ success: true })
      }
      // Remove a user-submitted review
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
