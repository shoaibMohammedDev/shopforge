/**
 * @file shared/types/admin.ts
 * @description Admin domain type definitions.
 */

import type { OrderDisplay } from './order'

/** Dashboard statistics for the admin panel. */
export interface AdminStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenueChange: number
  orderChange: number
  customerChange: number
  productsChange: number
  recentOrders: OrderDisplay[]
  topProducts: {
    product: {
      id: string
      name: string
      price: number
      images: string
    }
    totalSold: number
    revenue: number
  }[]
  ordersByStatus: {
    status: string
    count: number
  }[]
  salesByMonth: {
    month: string
    revenue: number
    orders: number
  }[]
}
