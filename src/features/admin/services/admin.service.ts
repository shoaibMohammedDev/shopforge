// ============================================================================
// ShopForge - Admin Service
// Business logic layer for admin dashboard operations
// ============================================================================

import { db } from '@/lib/db'
import { apiLogger } from '@/lib/logger'

// Local type for admin stats (more flexible than the shared type for internal use)
interface AdminDashboardStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenueChange: number
  orderChange: number
  customerChange: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentOrders: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  topProducts: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  salesByMonth: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ordersByStatus: any[]
}

class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return apiLogger.measure('getDashboardStats', async () => {
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

      const currentRevenue = orders
        .filter(o => new Date(o.createdAt) >= currentMonth)
        .reduce((s, o) => s + o.totalAmount, 0)
      const lastRevenue = orders
        .filter(o => { const d = new Date(o.createdAt); return d >= lastMonth && d < currentMonth })
        .reduce((s, o) => s + o.totalAmount, 0)
      const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

      const ordersByStatus = await db.order.groupBy({ by: ['status'], _count: true })

      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      const monthlyOrders = await db.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        select: { totalAmount: true, createdAt: true },
      })

      const salesByMonth: { month: string; revenue: number; orders: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
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

      const topProductsWithDetails = await Promise.all(
        (topProducts || []).map(async (tp) => {
          const product = await db.product.findUnique({
            where: { id: tp.productId },
            select: { id: true, name: true, price: true, images: true },
          })
          return { product, totalSold: tp._sum.quantity || 0, revenue: tp._sum.total || 0 }
        })
      )

      return {
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
      }
    })
  }

  async getProducts() {
    return db.product.findMany({
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        inventory: { select: { quantity: true, reserved: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getCustomers() {
    return db.user.findMany({
      where: { role: 'CUSTOMER' },
      include: {
        _count: { select: { orders: true } },
        orders: { select: { totalAmount: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getCoupons() {
    return db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async getReviews() {
    return db.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getBanners() {
    return db.banner.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  async getSettings(): Promise<Record<string, unknown>> {
    const settings = await db.storeSettings.findMany()
    const settingsMap: Record<string, unknown> = {}
    settings.forEach(s => { settingsMap[s.key] = JSON.parse(s.value) })
    return settingsMap
  }

  async updateSettings(data: Record<string, unknown>): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await db.storeSettings.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      })
    }
    apiLogger.info('Store settings updated', { keys: Object.keys(data) })
  }

  async toggleUser(userId: string, isActive: boolean) {
    const user = await db.user.update({ where: { id: userId }, data: { isActive } })
    apiLogger.info('User status toggled', { userId, isActive })
    return user
  }

  async approveReview(reviewId: string, isApproved: boolean) {
    const review = await db.review.update({ where: { id: reviewId }, data: { isApproved } })
    if (review.productId) {
      const stats = await db.review.aggregate({
        where: { productId: review.productId, isApproved: true },
        _avg: { rating: true },
        _count: true,
      })
      await db.product.update({
        where: { id: review.productId },
        data: { avgRating: stats._avg.rating || 0, reviewCount: stats._count },
      })
    }
    apiLogger.info('Review moderated', { reviewId, isApproved })
    return review
  }
}

export const adminService = new AdminService()
