// ============================================================================
// File: admin.service.ts
// Description: Admin dashboard statistics and management service for ShopForge
// Key Responsibilities:
//   - Aggregate dashboard statistics (revenue, orders, customers, products)
//   - Calculate month-over-month growth percentages for key metrics
//   - Generate sales-by-month and orders-by-status breakdowns for charts
//   - Provide CRUD access to products, customers, coupons, reviews, banners
//   - Manage store-wide settings via key-value upserts
//   - Handle user activation/deactivation and review moderation
// ============================================================================

import { db } from '@/lib/db'
import { apiLogger } from '@/lib/logger'

/**
 * Shape of the admin dashboard statistics payload returned to the frontend.
 * Includes high-level KPIs, growth rates, and chart-ready data arrays.
 *
 * Uses `any[]` for chart data fields because each chart (recent orders,
 * top products, sales by month, orders by status) has a distinct shape
 * that is constructed dynamically at query time.
 */
interface AdminDashboardStats {
  /** Total lifetime revenue across all non-cancelled/non-refunded orders (in dollars) */
  totalRevenue: number
  /** Total number of orders placed (all statuses) */
  totalOrders: number
  /** Total number of customers with role CUSTOMER */
  totalCustomers: number
  /** Total number of active products in the catalog */
  totalProducts: number
  /** Month-over-month revenue change as a percentage (e.g., 12.5 means +12.5%) */
  revenueChange: number
  /** Month-over-month order count change as a percentage (placeholder, currently 0) */
  orderChange: number
  /** Month-over-month customer count change as a percentage (placeholder, currently 0) */
  customerChange: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /** 10 most recent orders with items and payment info for the dashboard table */
  recentOrders: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /** Top 5 best-selling products by revenue with product details */
  topProducts: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /** Revenue and order count grouped by month for the last 6 months */
  salesByMonth: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  /** Order counts grouped by status for the status breakdown chart */
  ordersByStatus: any[]
}

/**
 * AdminService — centralised business logic layer for the admin dashboard.
 *
 * Every public method is wrapped with `apiLogger.measure()` so that
 * execution time is automatically recorded for performance monitoring.
 * All database queries go through Prisma Client (`db`).
 */
class AdminService {
  /**
   * Retrieve the full set of dashboard statistics in a single call.
   *
   * This method parallelises as many independent queries as possible via
   * `Promise.all` to minimise total latency. The sequential steps are:
   *   1. Fetch core counts + order data in parallel
   *   2. Compute revenue totals and month-over-month growth
   *   3. Query orders-by-status aggregation
   *   4. Query monthly order data for the last 6 months and build the chart array
   *   5. Enrich top-product aggregates with product details
   *
   * @returns {Promise<AdminDashboardStats>} Complete dashboard statistics payload
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return apiLogger.measure('getDashboardStats', async () => {
      // Step 1: Fire off all independent queries concurrently
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
        // Fetch all non-cancelled/non-refunded orders for revenue calculation
        db.order.findMany({ where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
        // 10 most recent orders with items and payment status for the dashboard table
        db.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            items: true,
            payment: { select: { status: true, method: true } },
          },
        }),
        // Top 5 products by total revenue using Prisma groupBy aggregation
        db.orderItem.groupBy({
          by: ['productId'],
          _sum: { quantity: true, total: true },
          orderBy: { _sum: { total: 'desc' } },
          take: 5,
        }),
      ])

      // Step 2: Sum revenue across all qualifying orders
      const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)

      // Calculate the boundary dates for the current and previous calendar months
      // so we can compute month-over-month revenue change
      const currentMonth = new Date()
      currentMonth.setDate(1)          // First day of the current month
      currentMonth.setHours(0, 0, 0, 0)
      const lastMonth = new Date(currentMonth)
      lastMonth.setMonth(lastMonth.getMonth() - 1) // First day of the previous month

      // Revenue generated in the current calendar month
      const currentRevenue = orders
        .filter(o => new Date(o.createdAt) >= currentMonth)
        .reduce((s, o) => s + o.totalAmount, 0)
      // Revenue generated in the previous calendar month
      const lastRevenue = orders
        .filter(o => { const d = new Date(o.createdAt); return d >= lastMonth && d < currentMonth })
        .reduce((s, o) => s + o.totalAmount, 0)
      // Percentage change: (current - last) / last * 100; avoid division by zero
      const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

      // Step 3: Group order counts by status for the status breakdown chart
      const ordersByStatus = await db.order.groupBy({ by: ['status'], _count: true })

      // Step 4: Build the 6-month sales trend data
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      // Fetch all orders in the last 6 months (excluding cancelled/refunded)
      const monthlyOrders = await db.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo }, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
        select: { totalAmount: true, createdAt: true },
      })

      // Iterate backwards from the current month to build the chart array
      // in chronological order (oldest month first)
      const salesByMonth: { month: string; revenue: number; orders: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        // Human-readable month label, e.g. "Jan 2025"
        const monthStr = d.toLocaleString('default', { month: 'short', year: 'numeric' })
        // Filter orders that fall within this specific month/year
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

      // Step 5: Enrich the top-products groupBy results with product details
      // (name, price, images) so the dashboard can display them meaningfully
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
        orderChange: 0,   // Placeholder — not yet calculated
        customerChange: 0, // Placeholder — not yet calculated
        recentOrders,
        // Filter out any top products whose product record has been deleted
        topProducts: topProductsWithDetails.filter(tp => tp.product),
        salesByMonth,
        ordersByStatus: ordersByStatus.map(s => ({ status: s.status, count: s._count })),
      }
    })
  }

  /**
   * Retrieve all products with their category, brand, and inventory data.
   *
   * Used by the admin product management table. Ordered by newest first
   * so the most recently added products appear at the top.
   *
   * @returns {Promise<Array>} List of products with related data
   */
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

  /**
   * Retrieve all customers with their order count and most recent order total.
   *
   * Uses Prisma's `_count` virtual field for efficient order counting
   * without loading full order records.
   *
   * @returns {Promise<Array>} List of customers with order summaries
   */
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

  /**
   * Retrieve all coupons ordered by creation date (newest first).
   *
   * @returns {Promise<Array>} List of all coupon records
   */
  async getCoupons() {
    return db.coupon.findMany({ orderBy: { createdAt: 'desc' } })
  }

  /**
   * Retrieve all reviews with user and product details for moderation.
   *
   * Includes the reviewer's name/email and the reviewed product's
   * name/images so admins can make informed moderation decisions.
   *
   * @returns {Promise<Array>} List of reviews with user and product info
   */
  async getReviews() {
    return db.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { name: true, images: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Retrieve all banners ordered by their sort position.
   *
   * Banners are displayed on the storefront homepage; the `sortOrder`
   * field determines their visual order from top to bottom.
   *
   * @returns {Promise<Array>} List of banner records sorted by position
   */
  async getBanners() {
    return db.banner.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  /**
   * Retrieve all store settings as a key-value map.
   *
   * Settings are stored as JSON strings in the database; this method
   * parses each value back into its original type before returning.
   *
   * @returns {Promise<Record<string, unknown>>} Map of setting keys to their parsed values
   */
  async getSettings(): Promise<Record<string, unknown>> {
    const settings = await db.storeSettings.findMany()
    const settingsMap: Record<string, unknown> = {}
    // Parse each JSON-encoded setting value back to its native type
    settings.forEach(s => { settingsMap[s.key] = JSON.parse(s.value) })
    return settingsMap
  }

  /**
   * Update store settings by upserting each key-value pair.
   *
   * Uses Prisma's `upsert` to create a setting if it doesn't exist
   * or update it if it does, allowing for incremental setting additions.
   *
   * @param {Record<string, unknown>} data - Map of setting keys to their new values
   * @returns {Promise<void>}
   */
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

  /**
   * Toggle a user's active status (enable/disable account).
   *
   * Disabled users cannot log in or place orders. This is the primary
   * mechanism for admins to suspend problematic accounts.
   *
   * @param {string} userId - The ID of the user to toggle
   * @param {boolean} isActive - The new active status (true = enabled, false = disabled)
   * @returns {Promise<object>} The updated user record
   */
  async toggleUser(userId: string, isActive: boolean) {
    const user = await db.user.update({ where: { id: userId }, data: { isActive } })
    apiLogger.info('User status toggled', { userId, isActive })
    return user
  }

  /**
   * Approve or reject a review and recalculate the product's rating stats.
   *
   * After updating the review's approval status, this method recalculates
   * the parent product's `avgRating` and `reviewCount` so that product
   * listings always reflect only approved reviews.
   *
   * @param {string} reviewId - The ID of the review to moderate
   * @param {boolean} isApproved - Whether the review is approved (true) or rejected (false)
   * @returns {Promise<object>} The updated review record
   */
  async approveReview(reviewId: string, isApproved: boolean) {
    const review = await db.review.update({ where: { id: reviewId }, data: { isApproved } })
    // Recalculate the product's aggregated review statistics so that
    // ratings only reflect approved reviews
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

/** Singleton instance of AdminService for use across the application */
export const adminService = new AdminService()
