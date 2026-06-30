/**
 * @file shared/constants/order.ts
 * @description Order-related constants.
 */

export const ORDER_STATUS = {
  PENDING: 'PENDING', PAID: 'PAID', PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED', DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED', REFUNDED: 'REFUNDED',
} as const

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-green-100 text-green-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
}

export const PAYMENT_STATUS = {
  PENDING: 'PENDING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', REFUNDED: 'REFUNDED',
} as const

export const PAYMENT_METHODS = { STRIPE: 'STRIPE', PAYPAL: 'PAYPAL' } as const
