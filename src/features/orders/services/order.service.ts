// ============================================================================
// ShopForge - Order Service
// Business logic layer for order management
// ============================================================================

import { orderRepository, type CreateOrderInput } from '../repositories/order.repository'
import { apiLogger, orderLogger } from '@/lib/logger'
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/errors'
import type { CreateOrderRequestDTO, UpdateOrderStatusDTO, OrderDTO } from '../dto/order.dto'
import { db } from '@/lib/db'

class OrderService {
  /**
   * Get orders for a user
   */
  async getUserOrders(userId: string): Promise<OrderDTO[]> {
    return orderLogger.measure('getUserOrders', async () => {
      const orders = await orderRepository.findByUserId(userId)
      return orders as unknown as OrderDTO[]
    })
  }

  /**
   * Get a single order by ID with authorization check
   */
  async getOrder(orderId: string, requestingUserId?: string): Promise<OrderDTO> {
    const order = await orderRepository.findDetail(orderId)
    if (!order) {
      throw new NotFoundError('Order')
    }

    // Authorization: only the order owner or admin can view
    if (requestingUserId && order.userId !== requestingUserId) {
      const user = await db.user.findUnique({ where: { id: requestingUserId } })
      if (!user || user.role !== 'ADMIN') {
        throw new AuthorizationError('Access denied to this order')
      }
    }

    return order as unknown as OrderDTO
  }

  /**
   * Create a new order with full transactional integrity
   */
  async createOrder(data: CreateOrderRequestDTO): Promise<OrderDTO> {
    return orderLogger.measure('createOrder', async () => {
      // Validate stock availability before creating order
      for (const item of data.items) {
        const inventory = await db.inventory.findFirst({
          where: { productId: item.productId, variantId: item.variantId || null },
        })
        if (inventory && inventory.quantity < item.quantity) {
          throw new ValidationError(`Insufficient stock for ${item.productName}. Available: ${inventory.quantity}`)
        }
      }

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
   * Update order status (admin)
   */
  async updateOrderStatus(data: UpdateOrderStatusDTO): Promise<OrderDTO> {
    return orderLogger.measure('updateOrderStatus', async () => {
      const order = await orderRepository.updateStatus(data.orderId, data.status, data.message)
      orderLogger.info('Order status updated', { orderId: data.orderId, status: data.status })
      return order as unknown as OrderDTO
    })
  }

  /**
   * Get all orders with filters (admin)
   */
  async getAllOrders(filters: { status?: string; page?: number; limit?: number }) {
    return orderRepository.findAllWithFilters(filters)
  }
}

export const orderService = new OrderService()
