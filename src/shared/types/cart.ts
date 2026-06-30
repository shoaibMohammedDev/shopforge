/**
 * @file shared/types/cart.ts
 * @description Cart domain type definitions.
 */

import type { CouponDisplay } from './coupon'

/** Cart item enriched with nested product and variant objects. */
export interface CartItemDisplay {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    slug: string
    price: number
    comparePrice: number | null
    images: string
    isActive: boolean
  }
  variant: {
    id: string
    name: string
    sku: string
    price: number
    comparePrice: number | null
    images: string | null
    attributes: string
    isActive: boolean
  } | null
  subtotal: number
}

/** Complete cart state with items, coupon, and totals. */
export interface CartDisplay {
  id: string
  items: CartItemDisplay[]
  subtotal: number
  discount: number
  shipping: number
  tax: number
  total: number
  coupon: {
    id: string
    code: string
    type: 'PERCENTAGE' | 'FIXED'
    value: number
    discountAmount: number
  } | null
  itemCount: number
  createdAt: string
  updatedAt: string
}
