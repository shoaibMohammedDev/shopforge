/**
 * @file shared/constants/product.ts
 * @description Product-related constants.
 */

export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
] as const

export const LOW_STOCK_THRESHOLD = 10
export const INVENTORY_RESERVATION_TIMEOUT_MS = 15 * 60 * 1000

export const COUPON_TYPES = { PERCENTAGE: 'PERCENTAGE', FIXED: 'FIXED' } as const
