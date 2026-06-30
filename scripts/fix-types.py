#!/usr/bin/env python3
"""
Post-restructuring fix script:
1. Fix barrel exports with correct component names
2. Fix split type files with missing properties from the original 719-line types file
3. Add missing RoutePath values
"""

from pathlib import Path

BASE = Path("/home/z/my-project/src")


def fix_route_path():
    """Add missing route values to the router types."""
    print("Fixing RoutePath type...")
    fp = BASE / "shared" / "types" / "router.ts"
    fp.write_text('''/**
 * @file shared/types/router.ts
 * @description Client-side SPA router type definitions.
 */

/** Union type for all navigable route identifiers. */
export type RoutePath =
  | 'home' | 'products' | 'product-detail' | 'cart' | 'checkout'
  | 'auth-login' | 'auth-register' | 'login' | 'register'
  | 'account' | 'account-dashboard' | 'account-orders'
  | 'account-order-detail' | 'account-wishlist'
  | 'account-addresses' | 'account-settings'
  | 'admin' | 'admin-dashboard' | 'admin-products' | 'admin-orders'
  | 'admin-customers' | 'admin-coupons' | 'admin-reviews' | 'admin-settings'
  | 'admin-analytics' | 'admin-banners'
  | 'not-found'

/** State shape for the client-side router store. */
export interface RouterState {
  currentRoute: RoutePath
  params: Record<string, string>
}
''', encoding='utf-8')
    print("  + Fixed RoutePath with missing routes")


def fix_product_types():
    """Add missing product type properties."""
    print("Fixing product types...")
    fp = BASE / "shared" / "types" / "product.ts"
    fp.write_text('''/**
 * @file shared/types/product.ts
 * @description Product domain type definitions.
 */

/** Lightweight product for listing grids. */
export interface ProductListItem {
  id: string; name: string; slug: string; price: number; comparePrice?: number
  image: string; images: string[]; category: string; categoryId: string
  brand?: string; rating: number; reviewCount: number
  isActive: boolean; isFeatured: boolean; isOnSale: boolean
  stock: number; tags: string[]; createdAt: string
  avgRating?: number
  flashSale?: { salePrice: number; endsAt: string }
}

/** Full product detail with variants, reviews, and inventory. */
export interface ProductDetail {
  id: string; name: string; slug: string; description: string; shortDesc?: string
  price: number; comparePrice?: number; images: string[]
  category: string; categoryId: string; brand?: string; brandId?: string
  rating: number; reviewCount: number
  isActive: boolean; isFeatured: boolean; isOnSale: boolean
  stock: number; sku: string; tags: string[]
  variants: ProductVariant[]; reviews: ReviewItem[]
  inventory: ProductInventory[]
  createdAt: string; updatedAt: string
  flashSale?: { salePrice: number; endsAt: string; discountPercent: number }
}

/** Product variant with its own SKU and inventory. */
export interface ProductVariant {
  id: string; name: string; sku: string; price: number; stock: number; image?: string
}

/** Product inventory record. */
export interface ProductInventory {
  id: string; sku: string; quantity: number; variantId?: string
}

/** A single product review. */
export interface ReviewItem {
  id: string; userId: string; userName: string; rating: number
  title?: string; content?: string; isApproved: boolean; createdAt: string
  helpfulYes?: number; helpfulNo?: number
  user?: { name: string; image?: string }
  isVerified?: boolean
}

/** Product filter/sort query parameters. */
export interface ProductFilters {
  search?: string; categoryId?: string; brandId?: string
  minPrice?: number; maxPrice?: number; minRating?: number
  sort?: string; page?: number; limit?: number
  isFeatured?: boolean; tag?: string
}
''', encoding='utf-8')
    print("  + Fixed product types (added inventory, review extras)")


def fix_admin_types():
    """Add missing admin type properties."""
    print("Fixing admin types...")
    fp = BASE / "shared" / "types" / "admin.ts"
    fp.write_text('''/**
 * @file shared/types/admin.ts
 * @description Admin domain type definitions.
 */

/** Dashboard statistics for the admin panel. */
export interface AdminStats {
  totalRevenue: number; totalOrders: number
  totalCustomers: number; totalProducts: number
  revenueChange: number; ordersChange: number
  customersChange: number; productsChange: number
  orderChange?: number; customerChange?: number
  topProducts: Array<{
    id: string; name: string; revenue: number; sold: number
    product?: { id: string; name: string; slug: string; image?: string }
    totalSold?: number
  }>
  salesByMonth: Array<{ month: string; revenue: number; orders: number }>
  ordersByStatus: Record<string, number>
  recentOrders?: OrderDisplay[]
}

/** Order display for admin (import from order types). */
export interface OrderDisplay {
  id: string; orderNumber: string; status: string
  items: Array<{ id: string; productId: string; productName: string; sku: string; price: number; quantity: number; total: number; image?: string }>
  shippingAddress: { firstName: string; lastName: string; street1: string; city: string; state: string; postalCode: string; country: string }
  subtotal: number; totalAmount: number
  shippingMethod: string; paymentStatus: string
  createdAt: string; updatedAt: string
}
''', encoding='utf-8')
    print("  + Fixed admin types (added recentOrders, topProducts extras)")


def fix_barrel_exports():
    """Fix barrel exports with correct component names."""
    print("Fixing barrel exports...")

    # Account barrel
    fp = BASE / "modules" / "account" / "index.ts"
    fp.write_text('''/**
 * @file modules/account/index.ts
 * @description Barrel export for the Account module.
 */
export { AccountLayout } from './components/account-layout'
export { AccountPage as AccountDashboard } from './components/account-dashboard'
export { AccountOrdersPage as AccountOrders, AccountOrderDetailPage as OrderDetailPage } from './components/account-orders'
export { AccountWishlistPage as AccountWishlist } from './components/account-wishlist'
export { AccountAddressesPage as AccountAddresses } from './components/account-addresses'
export { AccountSettingsPage as AccountSettings } from './components/account-settings'
''', encoding='utf-8')
    print("  + Fixed modules/account/index.ts")

    # Admin barrel
    fp = BASE / "modules" / "admin" / "index.ts"
    fp.write_text('''/**
 * @file modules/admin/index.ts
 * @description Barrel export for the Admin module.
 */
export { AdminPage } from './components/admin-page'
export { AdminDashboardContent as AdminDashboard } from './components/admin-dashboard'
export { AdminProductsContent as AdminProducts } from './components/admin-products'
export { AdminOrdersContent as AdminOrders } from './components/admin-orders'
export { AdminCustomersContent as AdminCustomers } from './components/admin-customers'
export { AdminCouponsContent as AdminCoupons } from './components/admin-coupons'
export { AdminReviewsContent as AdminReviews } from './components/admin-reviews'
export { AdminSettingsContent as AdminSettings } from './components/admin-settings'
export { adminService } from './services/admin.service'
''', encoding='utf-8')
    print("  + Fixed modules/admin/index.ts")

    # Cart barrel (default export)
    fp = BASE / "modules" / "cart" / "index.ts"
    fp.write_text('''/**
 * @file modules/cart/index.ts
 * @description Barrel export for the Cart module.
 */
export { default as CartPage } from './components/cart-page'
export { useCartStore } from './stores/cart-store'
''', encoding='utf-8')
    print("  + Fixed modules/cart/index.ts")

    # Checkout barrel (default export)
    fp = BASE / "modules" / "checkout" / "index.ts"
    fp.write_text('''/**
 * @file modules/checkout/index.ts
 * @description Barrel export for the Checkout module.
 */
export { default as CheckoutPage } from './components/checkout-page'
''', encoding='utf-8')
    print("  + Fixed modules/checkout/index.ts")

    # Products barrel (default exports)
    fp = BASE / "modules" / "products" / "index.ts"
    fp.write_text('''/**
 * @file modules/products/index.ts
 * @description Barrel export for the Products module.
 */
export { default as ProductsPage } from './components/products-page'
export { default as ProductDetailPage } from './components/product-detail-page'
export { productService } from './services/product.service'
export { ProductRepository } from './repositories/product.repository'
export type {
  ProductListQueryDTO, ProductDetailQueryDTO, CreateProductDTO,
  UpdateProductDTO, ProductListItemDTO, ProductDetailDTO,
  ProductVariantDTO, ReviewDTO, PaginatedProductsDTO,
} from './dto/product.dto'
''', encoding='utf-8')
    print("  + Fixed modules/products/index.ts")

    # Auth barrel
    fp = BASE / "modules" / "auth" / "index.ts"
    fp.write_text('''/**
 * @file modules/auth/index.ts
 * @description Barrel export for the Auth module.
 */
export { LoginPage, RegisterPage } from './components/auth-pages'
export { useAuthStore } from './stores/auth-store'
export { authService } from './services/auth.service'
export { authRepository } from './repositories/auth.repository'
export type {
  LoginRequestDTO, RegisterRequestDTO, VerifySessionRequestDTO,
  ChangePasswordRequestDTO, AuthRequestDTO, UserDTO, AuthResponseDTO,
  ChangePasswordResponseDTO,
} from './dto/auth.dto'
''', encoding='utf-8')
    print("  + Fixed modules/auth/index.ts")


def fix_all():
    fix_route_path()
    fix_product_types()
    fix_admin_types()
    fix_barrel_exports()
    print("\nAll fixes applied!")


if __name__ == "__main__":
    fix_all()
