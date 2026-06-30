/**
 * @file shared/index.ts
 * @description Barrel export for shared modules.
 */
export type {
  ApiResponse, PaginatedResponse, RoutePath, RouterState,
  ProductListItem, ProductDetail, ProductVariant, ReviewItem, ProductFilters,
  CartItemDisplay, CartDisplay, OrderDisplay, OrderItemDisplay, OrderTimelineItem,
  UserProfile, CategoryDisplay, BrandDisplay, AddressDisplay, CouponDisplay,
  BannerDisplay, AdminStats,
} from './types'
export {
  ORDER_STATUS, ORDER_STATUS_COLORS, PAYMENT_STATUS, PAYMENT_METHODS,
  PRODUCT_SORT_OPTIONS, LOW_STOCK_THRESHOLD, INVENTORY_RESERVATION_TIMEOUT_MS, COUPON_TYPES,
  TAX_RATE, FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_COST, EXPRESS_SHIPPING_COST,
  DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, PAGINATION_DEFAULTS, USER_ROLES, API_VERSION,
} from './constants'
export {
  loginSchema, registerSchema, authSchema, productQuerySchema,
  orderItemSchema, addressSchema, createOrderSchema,
  couponQuerySchema, createCouponSchema, adminActionSchema,
  adminUpdateOrderSchema, adminUpdateProductSchema, adminToggleUserSchema,
  adminApproveReviewSchema, adminUpdateSettingsSchema, adminCreateProductSchema,
  createAddressSchema, createReviewSchema,
} from './validators'
export { cn } from './lib/utils'
