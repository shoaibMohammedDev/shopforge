/**
 * @file constants.ts
 * @description Application-wide constants for ShopForge.
 *   Centralises every magic value — order statuses, user roles, payment
 *   states, tax rates, pagination limits, and more — into a single,
 *   importable location so that the rest of the codebase never hard-codes
 *   business rules.
 *
 * Key Responsibilities:
 *   - Define enum-like constant objects for order, payment, coupon, and user states
 *   - Provide UI colour mappings for status badges
 *   - Surface business-rule thresholds (tax rate, free-shipping minimum, stock alerts)
 *   - Set default pagination boundaries consumed by API routes and validators
 */

// ---- Order Status ----

/**
 * Finite set of lifecycle stages an order can transition through.
 *
 * Flow: PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
 * Branches: any status may transition to CANCELLED or REFUNDED.
 */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const

/** Union type derived from `ORDER_STATUS` values — used for type-safe status checks. */
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]

/**
 * Tailwind CSS class mappings for each order status badge.
 * Used in the admin dashboard and order-detail views to colour-code status pills.
 */
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

/**
 * Role-based access control levels.
 * SUPER_ADMIN > ADMIN > CUSTOMER — enforced in API route middleware.
 */
export const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const

/** Union type derived from `USER_ROLES` values. */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

// ---- Payment Methods ----

/**
 * Supported payment gateways. New providers (e.g. PayPal, Square) should be
 * added here and backed by a corresponding service adapter.
 */
export const PAYMENT_METHODS = {
  STRIPE: 'STRIPE',
  PAYPAL: 'PAYPAL',
} as const

// ---- Payment Status ----

/**
 * Lifecycle states for a payment attempt.
 * Mirrors the statuses returned by the Stripe API where applicable.
 */
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const

// ---- Coupon Types ----

/**
 * Discount calculation strategies for coupon codes.
 * PERCENTAGE — e.g. 20% off
 * FIXED — e.g. $10 off
 */
export const COUPON_TYPES = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const

// ---- Product Sort Options ----

/**
 * Available sort modes for product listing pages.
 * The `value` matches the `sort` query parameter consumed by the API;
 * the `label` is displayed in the sort dropdown UI.
 */
export const PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
] as const

// ---- Pagination ----

/** Number of items returned per page when no explicit `limit` is requested. */
export const DEFAULT_PAGE_SIZE = 12

/** Upper bound on items per page to prevent overly large DB queries. */
export const MAX_PAGE_SIZE = 100

// ---- Tax & Shipping ----

/** Flat sales-tax rate applied to all orders (8%). Adjust if per-region tax is needed. */
export const TAX_RATE = 0.08

/** Orders at or above this subtotal (USD) qualify for free standard shipping. */
export const FREE_SHIPPING_THRESHOLD = 50

/** Cost of standard (3–5 day) shipping in USD. */
export const STANDARD_SHIPPING_COST = 9.99

/** Cost of express (1–2 day) shipping in USD. */
export const EXPRESS_SHIPPING_COST = 19.99

// ---- Inventory ----

/**
 * Stock count at which a product is flagged as "low stock" in the admin
 * dashboard and the storefront shows a urgency badge.
 */
export const LOW_STOCK_THRESHOLD = 10

/**
 * How long (ms) an inventory reservation is held before it is released
 * back to available stock if the checkout is not completed.
 * 15 minutes balances user experience with inventory availability.
 */
export const INVENTORY_RESERVATION_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

// ---- API ----

/** Current API version prefix, included in route paths and error codes. */
export const API_VERSION = 'v1'

// ---- Pagination ----

/**
 * Default pagination parameters used when a client does not specify
 * `page` or `limit` query parameters.
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
} as const
