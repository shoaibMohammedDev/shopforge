// ============================================================================
// File: order.repository.ts
// Description: Data access layer for order operations with transactional support in ShopForge
// Key Responsibilities:
//   - Find orders by user ID with items and payment info
//   - Find a single order with full details (items, payment, timeline)
//   - Create orders atomically within a Prisma transaction (order + payment + inventory)
//   - Update order status with automatic timeline and payment tracking
//   - List all orders with status filtering and pagination for admin views
//   - Generate unique order numbers and payment transaction IDs
// ============================================================================

import { BaseRepository, type PaginationOptions, type FindManyResult } from '@/features/products/repositories/base.repository'
import { db } from '@/lib/db'
import crypto from 'crypto'

/**
 * Input shape for the createOrder repository method.
 *
 * Addresses are stored as `Record<string, unknown>` because they are
 * serialised to JSON strings in the database (Prisma doesn't have a
 * native JSON object type that matches our address structure).
 */
export interface CreateOrderInput {
  /** ID of the customer placing the order */
  userId: string
  /** Line items to include in the order */
  items: Array<{
    productId: string
    variantId?: string | null
    productName: string
    variantName?: string | null
    sku: string
    price: number
    quantity: number
    total: number
    image?: string | null
  }>
  /** Shipping address (will be JSON-stringified for storage) */
  shippingAddress: Record<string, unknown>
  /** Billing address (will be JSON-stringified for storage) */
  billingAddress: Record<string, unknown>
  /** Shipping method name (e.g., 'Standard', 'Express') */
  shippingMethod: string
  /** Subtotal of all items before tax/shipping/discount */
  subtotal: number
  /** Calculated tax amount */
  taxAmount: number
  /** Shipping cost */
  shippingAmount: number
  /** Coupon discount amount */
  discountAmount: number
  /** Final total to charge */
  totalAmount: number
  /** ID of the applied coupon, or null */
  couponId?: string | null
}

/**
 * OrderRepository — data access layer for order operations.
 *
 * Extends BaseRepository with order-specific queries. The most complex
 * method is `createOrder`, which uses a Prisma interactive transaction
 * to atomically create the order, payment record, and update inventory.
 *
 * Generic type parameters use `Record<string, unknown>` for flexibility
 * since Prisma's generated types don't easily align with the generic
 * repository pattern.
 */
export class OrderRepository extends BaseRepository<
  Record<string, unknown>,
  CreateOrderInput,
  Record<string, unknown>
> {
  /** Prisma model name used by BaseRepository to access the correct delegate */
  protected modelName = 'order'

  /**
   * Find all orders for a specific user, ordered by most recent first.
   *
   * Includes line items and basic payment info (status + method) so the
   * customer's order history page can display a complete summary without
   * additional requests.
   *
   * @param {string} userId - The customer's user ID
   * @returns {Promise<Record<string, unknown>[]>} List of orders with items and payment
   */
  async findByUserId(userId: string): Promise<Record<string, unknown>[]> {
    return db.order.findMany({
      where: { userId },
      include: {
        items: true,
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Record<string, unknown>[]>
  }

  /**
   * Find a single order with its complete details.
   *
   * Includes all line items, full payment record, and the complete
   * status timeline (most recent entries first). Used for the order
   * detail page where the customer or admin needs full visibility.
   *
   * @param {string} orderId - The order's unique identifier
   * @returns {Promise<Record<string, unknown> | null>} The order with full details, or null if not found
   */
  async findDetail(orderId: string): Promise<Record<string, unknown> | null> {
    return db.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    }) as Promise<Record<string, unknown> | null>
  }

  /**
   * Create a new order within an atomic Prisma transaction.
   *
   * This method performs three operations in a single transaction to ensure
   * data consistency — if any step fails, all changes are rolled back:
   *
   *   1. **Create the order** with all line items and an initial timeline entry
   *   2. **Create a payment record** in PENDING status with a generated transaction ID
   *   3. **Update inventory** for each item — decrement available quantity,
   *      adjust reserved count, and create an inventory history record
   *
   * Order numbers are generated using a base-36 timestamp for uniqueness
   * and readability (e.g., "SF-M3FGH2").
   *
   * @param {CreateOrderInput} input - The complete order creation data
   * @returns {Promise<Record<string, unknown>>} The newly created order with items
   * @throws {Error} If any item has insufficient stock (transaction is rolled back)
   */
  async createOrder(input: CreateOrderInput): Promise<Record<string, unknown>> {
    // Generate a unique, human-readable order number using base-36 timestamp
    // Example: "SF-M3FGH2" — the "SF" prefix identifies ShopForge orders
    const orderNumber = `SF-${Date.now().toString(36).toUpperCase()}`

    return db.$transaction(async (tx) => {
      // Step 1: Create the order with nested line items and initial timeline entry
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          status: 'PENDING',
          subtotal: input.subtotal,
          taxAmount: input.taxAmount,
          shippingAmount: input.shippingAmount,
          discountAmount: input.discountAmount,
          totalAmount: input.totalAmount,
          // Addresses are stored as JSON strings for flexible schema evolution
          shippingAddress: JSON.stringify(input.shippingAddress),
          billingAddress: JSON.stringify(input.billingAddress),
          shippingMethod: input.shippingMethod,
          couponId: input.couponId || null,
          items: {
            create: input.items.map(item => ({
              productId: item.productId,
              variantId: item.variantId || null,
              productName: item.productName,
              variantName: item.variantName || null,
              sku: item.sku,
              price: item.price,
              quantity: item.quantity,
              total: item.total,
              image: item.image || null,
            })),
          },
          // Automatically create the first timeline entry for the order
          timeline: {
            create: { status: 'PENDING', message: 'Order placed successfully' },
          },
        },
        include: { items: true },
      })

      // Step 2: Create a PENDING payment record with a generated transaction ID
      // The "pi_" prefix mimics Stripe's payment intent format for consistency
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: 'STRIPE',
          status: 'PENDING',
          amount: input.totalAmount,
          transactionId: `pi_${crypto.randomUUID()}`,
        },
      })

      // Step 3: Update inventory for each ordered item
      // Decrement available quantity and adjust the reserved count
      for (const item of input.items) {
        const inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, variantId: item.variantId || null },
        })

        if (inventory) {
          const newQty = inventory.quantity - item.quantity
          // Prevent overselling — if quantity goes negative, abort the transaction
          if (newQty < 0) {
            throw new Error(`Insufficient stock for ${item.productName}`)
          }

          // Decrement available quantity and reduce reserved count
          // (reserved tracks items in carts but not yet purchased)
          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: newQty, reserved: Math.max(0, inventory.reserved - item.quantity) },
          })

          // Create an inventory history record for audit trail
          // This allows tracking stock changes over time
          await tx.inventoryHistory.create({
            data: {
              inventoryId: inventory.id,
              changeType: 'SALE',
              quantity: -item.quantity,
              previousQty: inventory.quantity,
              newQty,
              reference: order.orderNumber,
            },
          })
        }
      }

      return order as unknown as Record<string, unknown>
    })
  }

  /**
   * Update an order's status and record the change in the timeline.
   *
   * Performs two operations in parallel:
   *   1. Updates the order's status field
   *   2. Creates a new timeline entry for the status change
   *
   * Additionally, when the status becomes PAID or DELIVERED, all payment
   * records for this order are updated to COMPLETED status.
   *
   * @param {string} orderId - The ID of the order to update
   * @param {string} status - The new status value
   * @param {string} [message] - Optional message for the timeline entry
   * @returns {Promise<Record<string, unknown>>} The updated order record
   */
  async updateStatus(orderId: string, status: string, message?: string): Promise<Record<string, unknown>> {
    // Update order status and create timeline entry in parallel for efficiency
    const [order] = await Promise.all([
      db.order.update({ where: { id: orderId }, data: { status } }),
      db.orderTimeline.create({
        data: { orderId, status, message: message || `Order status updated to ${status}` },
      }),
    ])

    // Update payment status if order is paid or delivered
    // This ensures the payment records stay in sync with order status
    if (status === 'PAID' || status === 'DELIVERED') {
      await db.payment.updateMany({
        where: { orderId },
        data: { status: 'COMPLETED' },
      })
    }

    return order as unknown as Record<string, unknown>
  }

  /**
   * Find all orders with optional status filtering and pagination (admin view).
   *
   * Includes the associated user (name, email), line items, and payment
   * info for each order so the admin table can display a comprehensive
   * summary without additional per-row requests.
   *
   * @param {object} filters - Filter and pagination options
   * @param {string} [filters.status] - Status to filter by, or 'ALL' for no filter
   * @param {number} [filters.page=1] - Page number (1-indexed)
   * @param {number} [filters.limit=50] - Number of results per page
   * @returns {Promise<FindManyResult<Record<string, unknown>>>} Paginated orders with user, items, and payment
   */
  async findAllWithFilters(filters: {
    status?: string
    page?: number
    limit?: number
  }): Promise<FindManyResult<Record<string, unknown>>> {
    const { status, page = 1, limit = 50 } = filters
    // 'ALL' or undefined status means no filter — return orders of all statuses
    const where = status && status !== 'ALL' ? { status } : {}

    // Run count and data queries in parallel to minimise latency
    const [items, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.order.count({ where }),
    ])

    return {
      items: items as unknown as Record<string, unknown>[],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }
}

/** Singleton instance of OrderRepository for use across the application */
export const orderRepository = new OrderRepository()
