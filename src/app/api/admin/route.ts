import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin - Admin dashboard stats
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'

    if (action === 'stats') {
      const [
        totalOrders,
        totalCustomers,
        totalProducts,
        orders,
        recentOrders,
        topProducts,
      ] = await Promise.all([
        db.order.count(),
        db.user.count({ where: { role: 'CUSTOMER' } }),
        db.product.count({ where: { isActive: true } }),
        db.order.findMany({ where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
        db.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            payment: { select: { status: true, method: true } },
          },
        }),
        db.orderItem.groupBy({
          by: ['productId'],
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { total: 'desc' } },
          take: 5,
        }),
      ])

      const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)
      const lastMonth = new Date(currentMonth)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const currentMonthOrders = orders.filter(o => new Date(o.createdAt) >= currentMonth)
      const lastMonthOrders = orders.filter(o => {
        const d = new Date(o.createdAt)
        return d >= lastMonth && d < currentMonth
      })

      const currentRevenue = currentMonthOrders.reduce((s, o) => s + o.totalAmount, 0)
      const lastRevenue = lastMonthOrders.reduce((s, o) => s + o.totalAmount, 0)
      const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

      // Orders by status
      const ordersByStatus = await db.order.groupBy({ by: ['status'], _count: true })

      // Sales by month (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const monthlyOrders = await db.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        select: { totalAmount: true, createdAt: true },
      })

      const salesByMonth: { month: string; revenue: number; orders: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1) // Set to first of month first to avoid date overflow
        d.setMonth(d.getMonth() - i)
        const monthStr = d.toLocaleString('default', { month: 'short', year: 'numeric' })
        const monthOrders = monthlyOrders.filter(o => {
          const od = new Date(o.createdAt)
          return od.getMonth() === d.getMonth() && od.getFullYear() === d.getFullYear()
        })
        salesByMonth.push({
          month: monthStr,
          revenue: monthOrders.reduce((s, o) => s + o.totalAmount, 0),
          orders: monthOrders.length,
        })
      }

      // Top products with details
      const topProductsWithDetails = await Promise.all(
        (topProducts || []).map(async (tp) => {
          const product = await db.product.findUnique({
            where: { id: tp.productId },
            select: { id: true, name: true, price: true, images: true },
          })
          return {
            product,
            totalSold: tp._sum.quantity || 0,
            revenue: tp._sum.total || 0,
          }
        })
      )

      return NextResponse.json({
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts,
        revenueChange,
        orderChange: 0,
        customerChange: 0,
        recentOrders,
        topProducts: topProductsWithDetails.filter(tp => tp.product),
        salesByMonth,
        ordersByStatus: ordersByStatus.map(s => ({ status: s.status, count: s._count })),
      })
    }

    if (action === 'products') {
      const products = await db.product.findMany({
        include: {
          category: { select: { name: true } },
          brand: { select: { name: true } },
          inventory: { select: { quantity: true, reserved: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(products)
    }

    if (action === 'orders') {
      const status = searchParams.get('status')
      const orders = await db.order.findMany({
        where: status && status !== 'ALL' ? { status } : {},
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true,
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return NextResponse.json(orders)
    }

    if (action === 'customers') {
      const customers = await db.user.findMany({
        where: { role: 'CUSTOMER' },
        include: {
          _count: { select: { orders: true } },
          orders: {
            select: { totalAmount: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(customers)
    }

    if (action === 'coupons') {
      const coupons = await db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
      return NextResponse.json(coupons)
    }

    if (action === 'reviews') {
      const reviews = await db.review.findMany({
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { name: true, images: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
      return NextResponse.json(reviews)
    }

    if (action === 'banners') {
      const banners = await db.banner.findMany({ orderBy: { sortOrder: 'asc' } })
      return NextResponse.json(banners)
    }

    if (action === 'settings') {
      const settings = await db.storeSettings.findMany()
      const settingsMap: Record<string, string> = {}
      settings.forEach(s => { settingsMap[s.key] = JSON.parse(s.value) })
      return NextResponse.json(settingsMap)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin API error:', error)
    return NextResponse.json({ error: 'Admin API failed' }, { status: 500 })
  }
}

// PUT /api/admin - Update operations
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { action, id, data } = body

    if (action === 'update-order-status') {
      const order = await db.order.update({
        where: { id },
        data: { status: data.status },
      })
      await db.orderTimeline.create({
        data: { orderId: id, status: data.status, message: data.message || `Order status updated to ${data.status}` },
      })
      if (data.status === 'PAID' || data.status === 'DELIVERED') {
        await db.payment.updateMany({
          where: { orderId: id },
          data: { status: data.status === 'PAID' ? 'COMPLETED' : data.status === 'DELIVERED' ? 'COMPLETED' : 'PENDING' },
        })
      }
      return NextResponse.json(order)
    }

    if (action === 'update-product') {
      const product = await db.product.update({ where: { id }, data })
      return NextResponse.json(product)
    }

    if (action === 'toggle-user') {
      const user = await db.user.update({ where: { id }, data: { isActive: data.isActive } })
      return NextResponse.json(user)
    }

    if (action === 'approve-review') {
      const review = await db.review.update({ where: { id }, data: { isApproved: data.isApproved } })
      return NextResponse.json(review)
    }

    if (action === 'update-settings') {
      for (const [key, value] of Object.entries(data)) {
        await db.storeSettings.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin PUT API error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// POST /api/admin - Create operations
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === 'create-coupon') {
      const coupon = await db.coupon.create({ data })
      return NextResponse.json(coupon, { status: 201 })
    }

    if (action === 'create-banner') {
      const banner = await db.banner.create({ data })
      return NextResponse.json(banner, { status: 201 })
    }

    if (action === 'create-product') {
      const product = await db.product.create({
        data: {
          ...data,
          images: JSON.stringify(data.images || []),
          slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          sku: data.sku || `SKU-${Date.now()}`,
        },
      })
      await db.inventory.create({
        data: {
          productId: product.id,
          quantity: data.stock || 0,
          reserved: 0,
          lowStockThreshold: 10,
          sku: product.sku,
        },
      })
      return NextResponse.json(product, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin POST API error:', error)
    return NextResponse.json({ error: 'Create failed' }, { status: 500 })
  }
}

// DELETE /api/admin - Delete operations
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const id = searchParams.get('id')

    if (action === 'delete-coupon' && id) {
      await db.coupon.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete-banner' && id) {
      await db.banner.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    if (action === 'delete-review' && id) {
      await db.review.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Admin DELETE API error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
