/**
 * @file shared/types/order.ts
 * @description Order domain type definitions.
 */

import type { AddressDisplay } from './address'

/** Order line item for display. */
export interface OrderItemDisplay {
  id: string
  productId: string
  productName: string
  variantName: string | null
  sku: string
  price: number
  quantity: number
  total: number
  image: string | null
}

/** Timeline entry tracking order lifecycle. */
export interface OrderTimelineItem {
  id: string
  status: string
  message: string | null
  createdAt: string
}

/** Full order display model. */
export interface OrderDisplay {
  id: string
  orderNumber: string
  status: string
  items: OrderItemDisplay[]
  shippingAddress: AddressDisplay
  billingAddress: AddressDisplay
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  trackingNumber: string | null
  shippingMethod: string | null
  paymentMethod: string
  paymentStatus: string
  timeline: OrderTimelineItem[]
  createdAt: string
  updatedAt: string
}
