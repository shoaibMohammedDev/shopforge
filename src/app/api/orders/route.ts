import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

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
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      return NextResponse.json(order)
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const orders = await db.order.findMany({
      where: { userId },
      include: {
        items: true,
        payment: { select: { status: true, method: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Orders API error:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

// POST /api/orders - Create order
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId, items, shippingAddress, billingAddress,
      shippingMethod, subtotal, taxAmount, shippingAmount,
      discountAmount, totalAmount, couponId,
    } = body

    const orderNumber = `SF-${Date.now().toString(36).toUpperCase()}`

    const order = await db.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING',
        subtotal,
        taxAmount: taxAmount || 0,
        shippingAmount: shippingAmount || 0,
        discountAmount: discountAmount || 0,
        totalAmount,
        shippingAddress: JSON.stringify(shippingAddress),
        billingAddress: JSON.stringify(billingAddress),
        shippingMethod: shippingMethod || 'Standard',
        couponId: couponId || null,
        items: {
          create: items.map((item: Record<string, unknown>) => ({
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
    await db.payment.create({
      data: {
        orderId: order.id,
        method: 'STRIPE',
        status: 'PENDING',
        amount: totalAmount,
        transactionId: `pi_${crypto.randomUUID()}`,
      },
    })

    // Update inventory
    for (const item of items as Array<Record<string, unknown>>) {
      const inventory = await db.inventory.findFirst({
        where: {
          productId: item.productId as string,
          variantId: (item.variantId as string) || null,
        },
      })
      if (inventory) {
        await db.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: inventory.quantity - (item.quantity as number),
            reserved: Math.max(0, inventory.reserved - (item.quantity as number)),
          },
        })
        await db.inventoryHistory.create({
          data: {
            inventoryId: inventory.id,
            changeType: 'SALE',
            quantity: -(item.quantity as number),
            previousQty: inventory.quantity,
            newQty: inventory.quantity - (item.quantity as number),
            reference: order.orderNumber,
          },
        })
      }
    }

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Create order API error:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
