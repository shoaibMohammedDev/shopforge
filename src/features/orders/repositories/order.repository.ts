// ============================================================================
// ShopForge - Order Repository
// Data access layer for order operations with transactional support
// ============================================================================

import { BaseRepository, type PaginationOptions, type FindManyResult } from '@/features/products/repositories/base.repository'
import { db } from '@/lib/db'
import crypto from 'crypto'

export interface CreateOrderInput {
  userId: string
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
  shippingAddress: Record<string, unknown>
  billingAddress: Record<string, unknown>
  shippingMethod: string
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  couponId?: string | null
}

export class OrderRepository extends BaseRepository<
  Record<string, unknown>,
  CreateOrderInput,
  Record<string, unknown>
> {
  protected modelName = 'order'

  /**
   * Find orders for a specific user
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
   * Find a single order with full details
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
   * Create order with atomic transaction (order + payment + inventory updates)
   */
  async createOrder(input: CreateOrderInput): Promise<Record<string, unknown>> {
    const orderNumber = `SF-${Date.now().toString(36).toUpperCase()}`

    return db.$transaction(async (tx) => {
      // Create the order
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
          timeline: {
            create: { status: 'PENDING', message: 'Order placed successfully' },
          },
        },
        include: { items: true },
      })

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: 'STRIPE',
          status: 'PENDING',
          amount: input.totalAmount,
          transactionId: `pi_${crypto.randomUUID()}`,
        },
      })

      // Update inventory
      for (const item of input.items) {
        const inventory = await tx.inventory.findFirst({
          where: { productId: item.productId, variantId: item.variantId || null },
        })

        if (inventory) {
          const newQty = inventory.quantity - item.quantity
          if (newQty < 0) {
            throw new Error(`Insufficient stock for ${item.productName}`)
          }

          await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantity: newQty, reserved: Math.max(0, inventory.reserved - item.quantity) },
          })

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
   * Update order status with timeline tracking
   */
  async updateStatus(orderId: string, status: string, message?: string): Promise<Record<string, unknown>> {
    const [order] = await Promise.all([
      db.order.update({ where: { id: orderId }, data: { status } }),
      db.orderTimeline.create({
        data: { orderId, status, message: message || `Order status updated to ${status}` },
      }),
    ])

    // Update payment status if order is paid or delivered
    if (status === 'PAID' || status === 'DELIVERED') {
      await db.payment.updateMany({
        where: { orderId },
        data: { status: 'COMPLETED' },
      })
    }

    return order as unknown as Record<string, unknown>
  }

  /**
   * Find all orders with filters (admin view)
   */
  async findAllWithFilters(filters: {
    status?: string
    page?: number
    limit?: number
  }): Promise<FindManyResult<Record<string, unknown>>> {
    const { status, page = 1, limit = 50 } = filters
    const where = status && status !== 'ALL' ? { status } : {}

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

export const orderRepository = new OrderRepository()
