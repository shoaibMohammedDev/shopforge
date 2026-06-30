// ============================================================================
// ShopForge - Constants & Configuration
// ============================================================================

// ---- Order Status ----
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
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

// ---- User Roles ----
export const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// ---- Payment Methods ----
export const PAYMENT_METHODS = {
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
} as const

// ---- Payment Status ----
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const

// ---- Coupon Types ----
export const COUPON_TYPES = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const

// ---- Product Sort Options ----
export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
] as const

// ---- Pagination ----
export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 100

// ---- Tax & Shipping ----
export const TAX_RATE = 0.08
export const FREE_SHIPPING_THRESHOLD = 50
export const STANDARD_SHIPPING_COST = 9.99
export const EXPRESS_SHIPPING_COST = 19.99

// ---- Inventory ----
export const LOW_STOCK_THRESHOLD = 10
export const INVENTORY_RESERVATION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

// ---- API ----
export const API_VERSION = 'v1'

// ---- Pagination ----
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
} as const
