/**
 * @file shared/types/router.ts
 * @description Client-side SPA router type definitions.
 */

/** Union type for all navigable route identifiers. */
export type RoutePath =
  | 'home'
  | 'products'
  | 'product-detail'
  | 'cart'
  | 'checkout'
  | 'login'
  | 'register'
  | 'account'
  | 'account-orders'
  | 'account-order-detail'
  | 'account-wishlist'
  | 'account-addresses'
  | 'account-settings'
  | 'admin'
  | 'admin-products'
  | 'admin-orders'
  | 'admin-customers'
  | 'admin-analytics'
  | 'admin-coupons'
  | 'admin-reviews'
  | 'admin-settings'
  | 'admin-banners'

/** State shape for the client-side router store. */
export interface RouterState {
  navigate: (path: RoutePath, params?: Record<string, string>) => void
  goBack: () => void
  history: RoutePath[]
}
