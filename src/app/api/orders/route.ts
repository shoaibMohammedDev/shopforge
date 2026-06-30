/**
 * @file route.ts (Orders API)
 * @description Orders API route handler for the ShopForge e-commerce platform.
 *              Provides endpoints for retrieving a user's order history (with
 *              optional single-order detail) and creating new orders. Uses a
 *              service-layer pattern — all business logic including inventory
 *              reservation, coupon application, and order confirmation is
 *              delegated to the order service.
 *
 * @endpoint GET  /api/orders — Retrieve user's orders or a single order
 * @endpoint POST /api/orders — Create a new order
 *
 * @auth User — Both endpoints require a valid user context. The `userId` is
 *              provided as a query parameter (GET) or in the request body (POST).
 *              In production, this should be derived from the authenticated session.
 */

import { NextResponse } from 'next/server'
import { orderService } from '@/features/orders/services/order.service'
import { couponService } from '@/features/coupons/services/coupon.service'
import { createOrderSchema } from '@/lib/validators'
import { handleApiError, ValidationError } from '@/lib/errors'

/**
 * Handles GET requests to retrieve order data.
 *
 * @description Returns either a single order (when `orderId` is provided) or
 *              a list of all orders for a given user. If `orderId` is present,
 *              the `userId` parameter is optional and used for access control.
 *              If `orderId` is absent, `userId` is required.
 *
 * @param request - The incoming Next.js Request object.
 *
 * @queryParam userId  - The user ID whose orders to retrieve (string, required unless orderId is provided).
 * @queryParam orderId - A specific order ID to retrieve (string, optional).
 *                        When provided, returns a single order detail instead of a list.
 *
 * @returns JSON response with order data wrapped in a success envelope.
 *
 * @response 200 - Application/json — Order(s) retrieved successfully.
 *   // Single order:
 *   { "success": true, "data": { "id": "ord_1", "status": "DELIVERED", "items": [...], ... } }
 *   // Order list:
 *   { "success": true, "data": [{ "id": "ord_1", ... }, { "id": "ord_2", ... }] }
 * @response 400 - Application/json — Validation error (userId missing when required).
 * @response 404 - Application/json — Order not found.
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Get all orders for a user
 * GET /api/orders?userId=user_123
 *
 * // Get a specific order
 * GET /api/orders?orderId=ord_456&userId=user_123
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const orderId = searchParams.get('orderId')

    // If an orderId is provided, fetch that single order
    if (orderId) {
      const order = await orderService.getOrder(orderId, userId || undefined)
      return NextResponse.json({ success: true, data: order })
    }

    // Otherwise, a userId is required to list orders
    if (!userId) {
      throw new ValidationError('userId is required')
    }

    // Fetch all orders for the user
    const orders = await orderService.getUserOrders(userId)
    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * Handles POST requests to create a new order.
 *
 * @description Validates the order payload using the Zod `createOrderSchema`,
 *              then delegates to the order service which handles:
 *              - Cart item verification and price locking
 *              - Coupon code validation and discount application
 *              - Inventory reservation and stock deduction
 *              - Order record creation with all line items
 *              - Coupon usage increment (if applicable)
 *
 * @param request - The incoming Next.js Request object with JSON body.
 *
 * @bodyParam userId      - The ID of the user placing the order (string, required).
 * @bodyParam items       - Array of order line items (required).
 *   @bodyParam items[].productId  - Product ID (string, required).
 *   @bodyParam items[].quantity   - Quantity to order (number, required, min 1).
 *   @bodyParam items[].variantId  - Product variant ID (string, optional).
 * @bodyParam addressId   - Shipping address ID (string, required).
 * @bodyParam couponCode  - Discount coupon code (string, optional).
 * @bodyParam shippingMethod - Shipping method identifier (string, optional).
 * @bodyParam notes       - Order notes / special instructions (string, optional).
 *
 * @returns JSON response with the created order data.
 *
 * @response 201 - Application/json — Order created successfully.
 *   { "success": true, "data": { "id": "ord_789", "status": "PENDING", "total": 99.99, ... } }
 * @response 400 - Application/json — Validation error (invalid/missing fields).
 * @response 409 - Application/json — Insufficient inventory or coupon conflict.
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Request
 * POST /api/orders
 * {
 *   "userId": "user_123",
 *   "items": [
 *     { "productId": "prod_1", "quantity": 2, "variantId": "var_red" },
 *     { "productId": "prod_2", "quantity": 1 }
 *   ],
 *   "addressId": "addr_456",
 *   "couponCode": "SAVE20",
 *   "shippingMethod": "standard"
 * }
 *
 * // Response (201)
 * { "success": true, "data": { "id": "ord_789", "status": "PENDING", "total": 159.99, ... } }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input with Zod — ensures all required fields are present
    // and correctly typed before the order service processes the order
    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) {
      // Transform Zod issues into a structured field-error map for the client
      const fields: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.join('.'))
        if (!fields[key]) fields[key] = []
        fields[key].push(issue.message)
      }
      throw new ValidationError('Invalid order data', fields)
    }

    // Delegate to service layer — handles the entire order creation pipeline:
    // price calculation, coupon validation, inventory checks, and DB transaction
    const order = await orderService.createOrder(parsed.data)
    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
