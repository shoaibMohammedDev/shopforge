// ============================================================================
// File: order.service.ts
// Description: Order processing and management service for ShopForge
// Key Responsibilities:
//   - Retrieve orders for a specific user (customer view)
//   - Retrieve a single order with authorization checks (owner or admin only)
//   - Create new orders with pre-creation stock validation
//   - Update order status with timeline tracking (admin)
//   - List all orders with status filters and pagination (admin)
// ============================================================================

import { orderRepository, type CreateOrderInput } from '../repositories/order.repository'
import { apiLogger, orderLogger } from '@/lib/logger'
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors'
import type { CreateOrderRequestDTO, UpdateOrderStatusDTO, OrderDTO } from '../dto/order.dto'
import { db } from '@/lib/db'

/**
 * OrderService — business logic layer for order operations.
 *
 * This service acts as the orchestrator between the API routes and the
 * order repository. It handles:
 *   - **Authorization**: Ensures customers can only access their own orders
 *   - **Validation**: Checks stock availability before order creation
 *   - **Logging**: Wraps operations with `orderLogger.measure()` for monitoring
 */
class OrderService {
  /**
   * Retrieve all orders for a specific user, ordered by most recent first.
   *
   * Each order includes its line items and payment status/method, providing
   * the customer with a complete order history view.
   *
   * @param {string} userId - The ID of the customer whose orders to retrieve
   * @returns {Promise<OrderDTO[]>} List of the user's orders with items and payment info
   */
  async getUserOrders(userId: string): Promise<OrderDTO[]> {
    return orderLogger.measure('getUserOrders', async () => {
      const orders = await orderRepository.findByUserId(userId)
      return orders as unknown as OrderDTO[]
    })
  }

  /**
   * Retrieve a single order by ID with authorization enforcement.
   *
   * If a `requestingUserId` is provided, the method verifies that the
   * requesting user is either the order owner or an admin. This prevents
   * customers from accessing other users' order details by guessing IDs.
   *
   * @param {string} orderId - The ID of the order to retrieve
   * @param {string} [requestingUserId] - Optional ID of the user making the request
   *   (if omitted, no authorization check is performed — used for internal/server-side calls)
   * @returns {Promise<OrderDTO>} The order with full details (items, payment, timeline)
   * @throws {NotFoundError} If the order doesn't exist
   * @throws {AuthorizationError} If the requesting user is neither the owner nor an admin
   */
  async getOrder(orderId: string, requestingUserId?: string): Promise<OrderDTO> {
    const order = await orderRepository.findDetail(orderId)
    if (!order) {
      throw new NotFoundError('Order')
    }

    // Authorization: only the order owner or an admin can view
    // This check is skipped when no requestingUserId is provided,
    // which allows internal/server-side code to access any order
    if (requestingUserId && order.userId !== requestingUserId) {
      const user = await db.user.findUnique({ where: { id: requestingUserId } })
      if (!user || user.role !== 'ADMIN') {
        throw new AuthorizationError('Access denied to this order')
      }
    }

    return order as unknown as OrderDTO
  }

  /**
   * Create a new order with full validation and transactional integrity.
   *
   * Steps:
   *   1. Validate stock availability for every item in the order
   *   2. Map the request DTO to the repository's CreateOrderInput
   *   3. Delegate to the repository which runs an atomic Prisma transaction
   *      that creates the order, payment record, and updates inventory atomically
   *
   * If any step fails (e.g., insufficient stock), no data is persisted.
   *
   * @param {CreateOrderRequestDTO} data - The complete order creation payload
   * @param {string} data.userId - The customer placing the order
   * @param {Array} data.items - Order line items with product/variant details
   * @param {AddressDTO} data.shippingAddress - The shipping destination
   * @param {AddressDTO} data.billingAddress - The billing address
   * @param {string} data.shippingMethod - 'Standard' or 'Express'
   * @param {number} data.subtotal - Sum of item totals before tax/shipping/discount
   * @param {number} data.taxAmount - Calculated tax amount
   * @param {number} data.shippingAmount - Shipping cost
   * @param {number} data.discountAmount - Coupon discount amount (0 if no coupon)
   * @param {number} data.totalAmount - Final amount to be charged
   * @param {string} [data.couponId] - Optional applied coupon ID
   * @returns {Promise<OrderDTO>} The newly created order with items
   * @throws {ValidationError} If any item has insufficient stock
   */
  async createOrder(data: CreateOrderRequestDTO): Promise<OrderDTO> {
    return orderLogger.measure('createOrder', async () => {
      // Validate stock availability before creating order
      // This pre-check prevents the transaction from failing partway through
      // and provides a clear error message to the customer
      for (const item of data.items) {
        const inventory = await db.inventory.findFirst({
          where: { productId: item.productId, variantId: item.variantId || null },
        })
        if (inventory && inventory.quantity < item.quantity) {
          throw new ValidationError(`Insufficient stock for ${item.productName}. Available: ${inventory.quantity}`)
        }
      }

      // Map the request DTO to the repository's input shape
      const input: CreateOrderInput = {
        userId: data.userId,
        items: data.items,
        shippingAddress: data.shippingAddress as unknown as Record<string, unknown>,
        billingAddress: data.billingAddress as unknown as Record<string, unknown>,
        shippingMethod: data.shippingMethod,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        shippingAmount: data.shippingAmount,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        couponId: data.couponId,
      }

      // The repository handles the atomic transaction (order + payment + inventory)
      const order = await orderRepository.createOrder(input)
      orderLogger.info('Order created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: data.totalAmount,
      })

      return order as unknown as OrderDTO
    })
  }

  /**
   * Update the status of an order (admin only).
   *
   * Delegates to the repository which also creates a timeline entry
   * and updates the payment status when appropriate (e.g., marking
   * payment as COMPLETED when the order is marked PAID or DELIVERED).
   *
   * @param {UpdateOrderStatusDTO} data - The status update payload
   * @param {string} data.orderId - The ID of the order to update
   * @param {string} data.status - The new status (e.g., 'PROCESSING', 'SHIPPED')
   * @param {string} [data.message] - Optional message for the timeline entry
   * @returns {Promise<OrderDTO>} The updated order record
   */
  async updateOrderStatus(data: UpdateOrderStatusDTO): Promise<OrderDTO> {
    return orderLogger.measure('updateOrderStatus', async () => {
      const order = await orderRepository.updateStatus(data.orderId, data.status, data.message)
      orderLogger.info('Order status updated', { orderId: data.orderId, status: data.status })
      return order as unknown as OrderDTO
    })
  }

  /**
   * Retrieve all orders with optional status filtering and pagination (admin only).
   *
   * Supports filtering by order status and standard pagination controls.
   * When status is 'ALL' or omitted, all orders are returned.
   *
   * @param {object} filters - Filter and pagination options
   * @param {string} [filters.status] - Order status to filter by (e.g., 'PENDING', 'SHIPPED'),
   *   or 'ALL' to include all statuses
   * @param {number} [filters.page=1] - Page number for pagination
   * @param {number} [filters.limit=50] - Number of orders per page
   * @returns {Promise<FindManyResult>} Paginated list of orders with user, items, and payment info
   */
  async getAllOrders(filters: { status?: string; page?: number; limit?: number }) {
    return orderRepository.findAllWithFilters(filters)
  }
}

/** Singleton instance of OrderService for use across the application */
export const orderService = new OrderService()
