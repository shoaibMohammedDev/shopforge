import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { createOrderSchema, productQuerySchema } from '@/lib/validators'
import { handleApiError, NotFoundError, ValidationError } from '@/lib/errors'

// GET /api/orders - Get user's orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const orderId = searchParams.get('orderId')

    if (orderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payment: true,
          timeline: { orderBy: { createdAt: 'desc' } },
        },
      })
      if (!order) {
        throw new NotFoundError('Order')
      }
      // Verify the order belongs to the requesting user (or user is admin)
      if (userId && order.userId !== userId) {
        const user = await db.user.findUnique({ where: { id: userId } })
        if (!user || user.role !== 'ADMIN') {
          return NextResponse.json({ success: false, error: 'Access denied', code: 'AUTHORIZATION_ERROR' }, { status: 403 })
        }
      }
      return NextResponse.json({ success: true, data: order })
    }

    if (!userId) {
      throw new ValidationError('userId is required')
    }

    const orders = await db.order.findMany({
      where: { userId },
      include: {
        items: true,
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: orders })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST /api/orders - Create order (wrapped in Prisma transaction)
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

    const data = parsed.data
    const orderNumber = `SF-${Date.now().toString(36).toUpperCase()}`

    // Use Prisma transaction for atomicity
    const order = await db.$transaction(async (tx) => {
      // Create the order with items and timeline
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: data.userId,
          status: 'PENDING',
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          shippingAmount: data.shippingAmount,
          discountAmount: data.discountAmount,
          totalAmount: data.totalAmount,
          shippingAddress: JSON.stringify(data.shippingAddress),
          billingAddress: JSON.stringify(data.billingAddress),
          shippingMethod: data.shippingMethod,
          couponId: data.couponId || null,
          items: {
            create: data.items.map((item) => ({
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
          orderId: newOrder.id,
          method: 'STRIPE',
          status: 'PENDING',
          amount: data.totalAmount,
          transactionId: `pi_${crypto.randomUUID()}`,
        },
      })

      // Update inventory for each item
      for (const item of data.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
          },
        })

        if (inventory) {
          const newQty = inventory.quantity - item.quantity
          if (newQty < 0) {
            throw new ValidationError(`Insufficient stock for ${item.productName}`)
          }

          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              quantity: newQty,
              reserved: Math.max(0, inventory.reserved - item.quantity),
            },
          })

          await tx.inventoryHistory.create({
            data: {
              inventoryId: inventory.id,
              changeType: 'SALE',
              quantity: -item.quantity,
              previousQty: inventory.quantity,
              newQty,
              reference: newOrder.orderNumber,
            },
          })
        }
      }

      return newOrder
    })

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
