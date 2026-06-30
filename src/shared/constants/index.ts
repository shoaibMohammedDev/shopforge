/**
 * @file shared/constants/index.ts
 * @description Barrel export for all shared constants.
 */

export { ORDER_STATUS, ORDER_STATUS_COLORS, PAYMENT_STATUS, PAYMENT_METHODS } from './order'
export type { OrderStatus } from './order'
export { PRODUCT_SORT_OPTIONS, LOW_STOCK_THRESHOLD, INVENTORY_RESERVATION_TIMEOUT_MS, COUPON_TYPES } from './product'
export { TAX_RATE, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST, EXPRESS_SHIPPING_COST } from './shipping'
export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PAGINATION_DEFAULTS } from './pagination'
export { USER_ROLES } from './user'
export type { UserRole } from './user'
export { API_VERSION } from './api'
