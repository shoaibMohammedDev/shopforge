#!/usr/bin/env python3
"""
Modular Restructuring Script for ShopForge E-Commerce Application
=================================================================

Reorganizes the project from a flat/layered structure into a domain-driven,
feature-modular architecture following industry best practices for Next.js.

Target Structure:
  src/
    app/              -> Next.js App Router (unchanged)
    modules/          -> Feature modules (auth, products, orders, cart, etc.)
    shared/           -> Cross-cutting shared code (ui, layout, hooks, lib, types, constants, validators)
    infrastructure/   -> Database, base repository
    middleware.ts      -> Next.js middleware (unchanged)
"""

import os
import re
import shutil
from pathlib import Path

BASE = Path("/home/z/my-project/src")

# ============================================================================
# 1. DIRECTORY STRUCTURE
# ============================================================================

NEW_DIRS = [
    # Feature modules
    "modules/auth/components",
    "modules/auth/stores",
    "modules/auth/services",
    "modules/auth/repositories",
    "modules/auth/dto",
    "modules/products/components",
    "modules/products/services",
    "modules/products/repositories",
    "modules/products/dto",
    "modules/orders/components",
    "modules/orders/services",
    "modules/orders/repositories",
    "modules/orders/dto",
    "modules/cart/components",
    "modules/cart/stores",
    "modules/checkout/components",
    "modules/account/components",
    "modules/admin/components",
    "modules/admin/services",
    "modules/coupons/services",
    "modules/coupons/dto",
    "modules/wishlist/stores",
    # Shared
    "shared/components/layout",
    "shared/components/home",
    "shared/hooks",
    "shared/lib/api-client",
    "shared/lib/config",
    "shared/lib/logger",
    "shared/lib/csrf",
    "shared/lib/errors",
    "shared/lib/utils",
    "shared/services/email",
    "shared/services/payments",
    "shared/services/upload",
    "shared/services/seo",
    "shared/stores",
    "shared/types",
    "shared/constants",
    "shared/validators",
    # Infrastructure
    "infrastructure/database",
    "infrastructure/base-repository",
]

# ============================================================================
# 2. FILE MOVES
# ============================================================================

FILE_MOVES = {
    # Auth Module
    "components/pages/auth/auth-pages.tsx":               "modules/auth/components/auth-pages.tsx",
    "stores/auth-store.ts":                                "modules/auth/stores/auth-store.ts",
    "features/auth/services/auth.service.ts":              "modules/auth/services/auth.service.ts",
    "features/auth/repositories/auth.repository.ts":       "modules/auth/repositories/auth.repository.ts",
    "features/auth/dto/auth.dto.ts":                       "modules/auth/dto/auth.dto.ts",

    # Products Module
    "components/pages/products/products-page.tsx":         "modules/products/components/products-page.tsx",
    "components/pages/products/product-detail-page.tsx":   "modules/products/components/product-detail-page.tsx",
    "features/products/services/product.service.ts":       "modules/products/services/product.service.ts",
    "features/products/repositories/product.repository.ts":"modules/products/repositories/product.repository.ts",
    "features/products/dto/product.dto.ts":                "modules/products/dto/product.dto.ts",

    # Orders Module
    "features/orders/services/order.service.ts":           "modules/orders/services/order.service.ts",
    "features/orders/repositories/order.repository.ts":    "modules/orders/repositories/order.repository.ts",
    "features/orders/dto/order.dto.ts":                    "modules/orders/dto/order.dto.ts",

    # Cart Module
    "components/pages/cart/cart-page.tsx":                 "modules/cart/components/cart-page.tsx",
    "stores/cart-store.ts":                                "modules/cart/stores/cart-store.ts",

    # Checkout Module
    "components/pages/checkout/checkout-page.tsx":         "modules/checkout/components/checkout-page.tsx",

    # Account Module
    "components/pages/account/account-layout.tsx":         "modules/account/components/account-layout.tsx",
    "components/pages/account/account-pages.tsx":          "modules/account/components/account-pages.tsx",
    "components/pages/account/account-dashboard.tsx":      "modules/account/components/account-dashboard.tsx",
    "components/pages/account/account-orders.tsx":         "modules/account/components/account-orders.tsx",
    "components/pages/account/account-wishlist.tsx":       "modules/account/components/account-wishlist.tsx",
    "components/pages/account/account-addresses.tsx":      "modules/account/components/account-addresses.tsx",
    "components/pages/account/account-settings.tsx":       "modules/account/components/account-settings.tsx",

    # Admin Module
    "components/pages/admin/admin-page.tsx":               "modules/admin/components/admin-page.tsx",
    "components/pages/admin/admin-dashboard.tsx":          "modules/admin/components/admin-dashboard.tsx",
    "components/pages/admin/admin-products.tsx":           "modules/admin/components/admin-products.tsx",
    "components/pages/admin/admin-orders.tsx":             "modules/admin/components/admin-orders.tsx",
    "components/pages/admin/admin-customers.tsx":          "modules/admin/components/admin-customers.tsx",
    "components/pages/admin/admin-coupons.tsx":            "modules/admin/components/admin-coupons.tsx",
    "components/pages/admin/admin-reviews.tsx":            "modules/admin/components/admin-reviews.tsx",
    "components/pages/admin/admin-settings.tsx":           "modules/admin/components/admin-settings.tsx",
    "features/admin/services/admin.service.ts":            "modules/admin/services/admin.service.ts",

    # Coupons Module
    "features/coupons/services/coupon.service.ts":         "modules/coupons/services/coupon.service.ts",
    "features/coupons/dto/coupon.dto.ts":                  "modules/coupons/dto/coupon.dto.ts",

    # Wishlist Module
    "stores/wishlist-store.ts":                            "modules/wishlist/stores/wishlist-store.ts",

    # Shared: Components
    "components/layout/header.tsx":                        "shared/components/layout/header.tsx",
    "components/layout/footer.tsx":                        "shared/components/layout/footer.tsx",
    "components/layout/providers.tsx":                     "shared/components/layout/providers.tsx",
    "components/pages/home/home-page.tsx":                 "shared/components/home/home-page.tsx",

    # Shared: Hooks
    "hooks/use-toast.ts":                                  "shared/hooks/use-toast.ts",
    "hooks/use-mobile.ts":                                 "shared/hooks/use-mobile.ts",

    # Shared: Lib
    "lib/api-client.ts":                                   "shared/lib/api-client/index.ts",
    "lib/config/index.ts":                                 "shared/lib/config/index.ts",
    "lib/logger/index.ts":                                 "shared/lib/logger/index.ts",
    "lib/csrf/index.ts":                                   "shared/lib/csrf/index.ts",
    "lib/errors.ts":                                       "shared/lib/errors/index.ts",
    "lib/utils.ts":                                        "shared/lib/utils/index.ts",

    # Shared: Services
    "lib/email/email.service.ts":                          "shared/services/email/email.service.ts",
    "lib/payments/stripe.service.ts":                      "shared/services/payments/stripe.service.ts",
    "lib/upload/upload.service.ts":                        "shared/services/upload/upload.service.ts",
    "lib/seo/structured-data.ts":                          "shared/services/seo/structured-data.ts",

    # Shared: Stores
    "stores/router-store.ts":                              "shared/stores/router-store.ts",

    # Infrastructure
    "lib/db.ts":                                           "infrastructure/database/index.ts",
    "features/products/repositories/base.repository.ts":   "infrastructure/base-repository/index.ts",
}

# ============================================================================
# 3. IMPORT MAPPINGS
# ============================================================================

IMPORT_MAP = {
    # Types
    r'from ["\']@/types["\']':                         r'from "@/shared/types"',
    r'from ["\']@/types/':                              r'from "@/shared/types/',

    # Lib -> Shared/Lib
    r'from ["\']@/lib/utils["\']':                     r'from "@/shared/lib/utils"',
    r'from ["\']@/lib/errors["\']':                    r'from "@/shared/lib/errors"',
    r'from ["\']@/lib/api-client["\']':                r'from "@/shared/lib/api-client"',
    r'from ["\']@/lib/config["\']':                    r'from "@/shared/lib/config"',
    r'from ["\']@/lib/config/':                         r'from "@/shared/lib/config/',
    r'from ["\']@/lib/logger["\']':                    r'from "@/shared/lib/logger"',
    r'from ["\']@/lib/logger/':                         r'from "@/shared/lib/logger/',
    r'from ["\']@/lib/csrf["\']':                      r'from "@/shared/lib/csrf"',
    r'from ["\']@/lib/csrf/':                           r'from "@/shared/lib/csrf/',
    r'from ["\']@/lib/constants["\']':                 r'from "@/shared/constants"',
    r'from ["\']@/lib/validators["\']':                r'from "@/shared/validators"',

    # Lib -> Shared/Services
    r'from ["\']@/lib/email/email\.service["\']':      r'from "@/shared/services/email/email.service"',
    r'from ["\']@/lib/payments/stripe\.service["\']':   r'from "@/shared/services/payments/stripe.service"',
    r'from ["\']@/lib/upload/upload\.service["\']':     r'from "@/shared/services/upload/upload.service"',
    r'from ["\']@/lib/seo/structured-data["\']':        r'from "@/shared/services/seo/structured-data"',

    # Lib -> Infrastructure
    r'from ["\']@/lib/db["\']':                         r'from "@/infrastructure/database"',

    # Components: UI
    r'from ["\']@/components/ui/':                      r'from "@/shared/components/ui/',

    # Components: Layout -> Shared
    r'from ["\']@/components/layout/header["\']':       r'from "@/shared/components/layout/header"',
    r'from ["\']@/components/layout/footer["\']':       r'from "@/shared/components/layout/footer"',
    r'from ["\']@/components/layout/providers["\']':    r'from "@/shared/components/layout/providers"',

    # Components: Pages -> Modules
    r'from ["\']@/components/pages/auth/auth-pages["\']':      r'from "@/modules/auth/components/auth-pages"',
    r'from ["\']@/components/pages/home/home-page["\']':        r'from "@/shared/components/home/home-page"',
    r'from ["\']@/components/pages/products/products-page["\']':r'from "@/modules/products/components/products-page"',
    r'from ["\']@/components/pages/products/product-detail-page["\']': r'from "@/modules/products/components/product-detail-page"',
    r'from ["\']@/components/pages/cart/cart-page["\']':        r'from "@/modules/cart/components/cart-page"',
    r'from ["\']@/components/pages/checkout/checkout-page["\']': r'from "@/modules/checkout/components/checkout-page"',
    r'from ["\']@/components/pages/account/account-layout["\']': r'from "@/modules/account/components/account-layout"',
    r'from ["\']@/components/pages/account/account-pages["\']':  r'from "@/modules/account/components/account-pages"',
    r'from ["\']@/components/pages/account/account-dashboard["\']': r'from "@/modules/account/components/account-dashboard"',
    r'from ["\']@/components/pages/account/account-orders["\']': r'from "@/modules/account/components/account-orders"',
    r'from ["\']@/components/pages/account/account-wishlist["\']': r'from "@/modules/account/components/account-wishlist"',
    r'from ["\']@/components/pages/account/account-addresses["\']': r'from "@/modules/account/components/account-addresses"',
    r'from ["\']@/components/pages/account/account-settings["\']': r'from "@/modules/account/components/account-settings"',
    r'from ["\']@/components/pages/admin/admin-page["\']':       r'from "@/modules/admin/components/admin-page"',
    r'from ["\']@/components/pages/admin/admin-dashboard["\']':  r'from "@/modules/admin/components/admin-dashboard"',
    r'from ["\']@/components/pages/admin/admin-products["\']':   r'from "@/modules/admin/components/admin-products"',
    r'from ["\']@/components/pages/admin/admin-orders["\']':     r'from "@/modules/admin/components/admin-orders"',
    r'from ["\']@/components/pages/admin/admin-customers["\']':  r'from "@/modules/admin/components/admin-customers"',
    r'from ["\']@/components/pages/admin/admin-coupons["\']':    r'from "@/modules/admin/components/admin-coupons"',
    r'from ["\']@/components/pages/admin/admin-reviews["\']':    r'from "@/modules/admin/components/admin-reviews"',
    r'from ["\']@/components/pages/admin/admin-settings["\']':   r'from "@/modules/admin/components/admin-settings"',

    # Stores -> Modules
    r'from ["\']@/stores/auth-store["\']':              r'from "@/modules/auth/stores/auth-store"',
    r'from ["\']@/stores/cart-store["\']':              r'from "@/modules/cart/stores/cart-store"',
    r'from ["\']@/stores/wishlist-store["\']':          r'from "@/modules/wishlist/stores/wishlist-store"',
    r'from ["\']@/stores/router-store["\']':            r'from "@/shared/stores/router-store"',

    # Hooks -> Shared
    r'from ["\']@/hooks/use-toast["\']':                r'from "@/shared/hooks/use-toast"',
    r'from ["\']@/hooks/use-mobile["\']':               r'from "@/shared/hooks/use-mobile"',

    # Features -> Modules
    r'from ["\']@/features/auth/services/auth\.service["\']':       r'from "@/modules/auth/services/auth.service"',
    r'from ["\']@/features/auth/repositories/auth\.repository["\']': r'from "@/modules/auth/repositories/auth.repository"',
    r'from ["\']@/features/auth/dto/auth\.dto["\']':                 r'from "@/modules/auth/dto/auth.dto"',
    r'from ["\']@/features/products/services/product\.service["\']': r'from "@/modules/products/services/product.service"',
    r'from ["\']@/features/products/repositories/product\.repository["\']': r'from "@/modules/products/repositories/product.repository"',
    r'from ["\']@/features/products/repositories/base\.repository["\']': r'from "@/infrastructure/base-repository"',
    r'from ["\']@/features/products/dto/product\.dto["\']':         r'from "@/modules/products/dto/product.dto"',
    r'from ["\']@/features/orders/services/order\.service["\']':     r'from "@/modules/orders/services/order.service"',
    r'from ["\']@/features/orders/repositories/order\.repository["\']': r'from "@/modules/orders/repositories/order.repository"',
    r'from ["\']@/features/orders/dto/order\.dto["\']':              r'from "@/modules/orders/dto/order.dto"',
    r'from ["\']@/features/coupons/services/coupon\.service["\']':   r'from "@/modules/coupons/services/coupon.service"',
    r'from ["\']@/features/coupons/dto/coupon\.dto["\']':            r'from "@/modules/coupons/dto/coupon.dto"',
    r'from ["\']@/features/admin/services/admin\.service["\']':      r'from "@/modules/admin/services/admin.service"',
}


def create_directories():
    print("=" * 60)
    print("STEP 1: Creating directory structure")
    print("=" * 60)
    for d in NEW_DIRS:
        full = BASE / d
        full.mkdir(parents=True, exist_ok=True)
        print(f"  + {d}")
    print()


def move_files():
    print("=" * 60)
    print("STEP 2: Moving files to new locations")
    print("=" * 60)

    # Move UI components directory
    old_ui = BASE / "components" / "ui"
    new_ui = BASE / "shared" / "components" / "ui"
    if old_ui.exists() and not new_ui.exists():
        shutil.copytree(old_ui, new_ui)
        print(f"  + components/ui/ -> shared/components/ui/ (entire directory)")
    elif old_ui.exists():
        for f in old_ui.iterdir():
            dest = new_ui / f.name
            if not dest.exists():
                shutil.copy2(f, dest)
                print(f"  + components/ui/{f.name} -> shared/components/ui/{f.name}")

    moved_count = 0
    for old_rel, new_rel in FILE_MOVES.items():
        old_path = BASE / old_rel
        new_path = BASE / new_rel
        if not old_path.exists():
            print(f"  SKIP (not found): {old_rel}")
            continue
        if new_path.exists():
            print(f"  SKIP (already exists): {new_rel}")
            continue
        new_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(old_path, new_path)
        moved_count += 1
        print(f"  + {old_rel} -> {new_rel}")

    print(f"\n  Total: {moved_count} files moved\n")


def update_imports_in_file(filepath: Path) -> bool:
    try:
        content = filepath.read_text(encoding='utf-8')
    except (UnicodeDecodeError, PermissionError):
        return False

    original = content
    for old_pattern, new_pattern in IMPORT_MAP.items():
        content = re.sub(old_pattern, new_pattern, content)

    if content != original:
        filepath.write_text(content, encoding='utf-8')
        return True
    return False


def update_all_imports():
    print("=" * 60)
    print("STEP 3: Updating import paths")
    print("=" * 60)
    changed = 0
    for ext in ['*.ts', '*.tsx']:
        for filepath in BASE.rglob(ext):
            rel = filepath.relative_to(BASE)
            parts = rel.parts
            if parts[0] in ('modules', 'shared', 'infrastructure', 'app'):
                if update_imports_in_file(filepath):
                    changed += 1
                    print(f"  + {rel}")
    # middleware.ts
    mw = BASE / "middleware.ts"
    if mw.exists() and update_imports_in_file(mw):
        changed += 1
        print(f"  + middleware.ts")
    print(f"\n  Total: {changed} files updated\n")


def split_types_file():
    print("=" * 60)
    print("STEP 4: Splitting types into domain files")
    print("=" * 60)
    td = BASE / "shared" / "types"

    files = {
        "api.ts": '''/**
 * @file shared/types/api.ts
 * @description API response type definitions for ShopForge.
 */

/** Standard API response envelope used by all backend endpoints. */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/** Paginated API response with pagination metadata. */
export interface PaginatedResponse<T = unknown> {
  success: boolean
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
''',

        "router.ts": '''/**
 * @file shared/types/router.ts
 * @description Client-side SPA router type definitions.
 */

/** Union type for all navigable route identifiers. */
export type RoutePath =
  | 'home' | 'products' | 'product-detail' | 'cart' | 'checkout'
  | 'auth-login' | 'auth-register'
  | 'account' | 'account-dashboard' | 'account-orders' | 'account-wishlist'
  | 'account-addresses' | 'account-settings'
  | 'admin' | 'admin-dashboard' | 'admin-products' | 'admin-orders'
  | 'admin-customers' | 'admin-coupons' | 'admin-reviews' | 'admin-settings'
  | 'not-found'

/** State shape for the client-side router store. */
export interface RouterState {
  currentRoute: RoutePath
  params: Record<string, string>
}
''',

        "product.ts": '''/**
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
  createdAt: string; updatedAt: string
  flashSale?: { salePrice: number; endsAt: string; discountPercent: number }
}

/** Product variant with its own SKU and inventory. */
export interface ProductVariant {
  id: string; name: string; sku: string; price: number; stock: number; image?: string
}

/** A single product review. */
export interface ReviewItem {
  id: string; userId: string; userName: string; rating: number
  title?: string; content?: string; isApproved: boolean; createdAt: string
}

/** Product filter/sort query parameters. */
export interface ProductFilters {
  search?: string; categoryId?: string; brandId?: string
  minPrice?: number; maxPrice?: number; minRating?: number
  sort?: string; page?: number; limit?: number
  isFeatured?: boolean; tag?: string
}
''',

        "cart.ts": '''/**
 * @file shared/types/cart.ts
 * @description Cart domain type definitions.
 */

/** Cart item enriched with product details. */
export interface CartItemDisplay {
  productId: string; name: string; slug: string; price: number
  comparePrice?: number; image: string; quantity: number
  variantId?: string; variantName?: string; stock: number
}

/** Complete cart state with items, coupon, and totals. */
export interface CartDisplay {
  items: CartItemDisplay[]; subtotal: number; discount: number
  shipping: number; tax: number; total: number
  coupon?: CouponDisplay; itemCount: number
}
''',

        "order.ts": '''/**
 * @file shared/types/order.ts
 * @description Order domain type definitions.
 */

/** Order line item for display. */
export interface OrderItemDisplay {
  id: string; productId: string; productName: string
  variantName?: string; sku: string; price: number
  quantity: number; total: number; image?: string
}

/** Timeline entry tracking order lifecycle. */
export interface OrderTimelineItem {
  status: string; timestamp: string; message?: string
}

/** Full order display model. */
export interface OrderDisplay {
  id: string; orderNumber: string; status: string
  items: OrderItemDisplay[]
  shippingAddress: AddressDisplay; billingAddress: AddressDisplay
  subtotal: number; taxAmount: number; shippingAmount: number
  discountAmount: number; totalAmount: number
  shippingMethod: string; paymentMethod: string; paymentStatus: string
  timeline: OrderTimelineItem[]; createdAt: string; updatedAt: string
}
''',

        "user.ts": '''/**
 * @file shared/types/user.ts
 * @description User domain type definitions.
 */

/** User profile data returned by the API. */
export interface UserProfile {
  id: string; name: string; email: string; image?: string
  role: string; isActive: boolean; createdAt: string
}
''',

        "category.ts": '''/**
 * @file shared/types/category.ts
 * @description Category domain type definitions.
 */

/** Product category with nested children. */
export interface CategoryDisplay {
  id: string; name: string; slug: string; image?: string
  sortOrder: number; productCount: number; children?: CategoryDisplay[]
}
''',

        "brand.ts": '''/**
 * @file shared/types/brand.ts
 * @description Brand domain type definitions.
 */

/** Product brand with product count. */
export interface BrandDisplay {
  id: string; name: string; slug: string; image?: string; productCount: number
}
''',

        "address.ts": '''/**
 * @file shared/types/address.ts
 * @description Address domain type definitions.
 */

/** Saved shipping/billing address. */
export interface AddressDisplay {
  id: string; userId: string; label?: string
  firstName: string; lastName: string
  street1: string; street2?: string
  city: string; state: string; postalCode: string; country: string
  phone?: string; isDefault: boolean
}
''',

        "coupon.ts": '''/**
 * @file shared/types/coupon.ts
 * @description Coupon domain type definitions.
 */

/** Discount coupon with type, usage limits, and validity window. */
export interface CouponDisplay {
  id: string; code: string; type: string; value: number
  minPurchase: number; maxDiscount?: number
  usageLimit?: number; usedCount: number; perUserLimit?: number
  startsAt?: string; expiresAt?: string; isActive: boolean
}
''',

        "banner.ts": '''/**
 * @file shared/types/banner.ts
 * @description Banner domain type definitions.
 */

/** Promotional banner for homepage carousel. */
export interface BannerDisplay {
  id: string; title: string; subtitle?: string
  image: string; link?: string; isActive: boolean; sortOrder: number
}
''',

        "admin.ts": '''/**
 * @file shared/types/admin.ts
 * @description Admin domain type definitions.
 */

/** Dashboard statistics for the admin panel. */
export interface AdminStats {
  totalRevenue: number; totalOrders: number
  totalCustomers: number; totalProducts: number
  revenueChange: number; ordersChange: number
  customersChange: number; productsChange: number
  topProducts: Array<{ id: string; name: string; revenue: number; sold: number }>
  salesByMonth: Array<{ month: string; revenue: number; orders: number }>
  ordersByStatus: Record<string, number>
}
''',
    }

    for fn, content in files.items():
        (td / fn).write_text(content.strip() + '\n', encoding='utf-8')
        print(f"  + shared/types/{fn}")

    # Copy external.d.ts
    ext = BASE / "types" / "external.d.ts"
    if ext.exists():
        shutil.copy2(ext, td / "external.d.ts")
        print(f"  + shared/types/external.d.ts")

    # Barrel
    barrel = '''/**
 * @file shared/types/index.ts
 * @description Barrel export for all shared type definitions.
 */

export type { ApiResponse, PaginatedResponse } from './api'
export type { RoutePath, RouterState } from './router'
export type { ProductListItem, ProductDetail, ProductVariant, ReviewItem, ProductFilters } from './product'
export type { CartItemDisplay, CartDisplay } from './cart'
export type { OrderDisplay, OrderItemDisplay, OrderTimelineItem } from './order'
export type { UserProfile } from './user'
export type { CategoryDisplay } from './category'
export type { BrandDisplay } from './brand'
export type { AddressDisplay } from './address'
export type { CouponDisplay } from './coupon'
export type { BannerDisplay } from './banner'
export type { AdminStats } from './admin'
'''
    (td / "index.ts").write_text(barrel.strip() + '\n', encoding='utf-8')
    print(f"  + shared/types/index.ts (barrel)")
    print()


def split_constants_file():
    print("=" * 60)
    print("STEP 5: Splitting constants into domain files")
    print("=" * 60)
    cd = BASE / "shared" / "constants"

    files = {
        "order.ts": '''/**
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
''',

        "product.ts": '''/**
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
''',

        "shipping.ts": '''/**
 * @file shared/constants/shipping.ts
 * @description Shipping and tax constants.
 */

export const TAX_RATE = 0.08
export const FREE_SHIPPING_THRESHOLD = 50
export const STANDARD_SHIPPING_COST = 9.99
export const EXPRESS_SHIPPING_COST = 19.99
''',

        "pagination.ts": '''/**
 * @file shared/constants/pagination.ts
 * @description Pagination constants.
 */

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 100
export const PAGINATION_DEFAULTS = { page: 1, limit: DEFAULT_PAGE_SIZE } as const
''',

        "user.ts": '''/**
 * @file shared/constants/user.ts
 * @description User-related constants.
 */

export const USER_ROLES = { CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN', SUPER_ADMIN: 'SUPER_ADMIN' } as const
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]
''',

        "api.ts": '''/**
 * @file shared/constants/api.ts
 * @description API-related constants.
 */

export const API_VERSION = 'v1'
''',
    }

    for fn, content in files.items():
        (cd / fn).write_text(content.strip() + '\n', encoding='utf-8')
        print(f"  + shared/constants/{fn}")

    barrel = '''/**
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
'''
    (cd / "index.ts").write_text(barrel.strip() + '\n', encoding='utf-8')
    print(f"  + shared/constants/index.ts (barrel)")
    print()


def split_validators_file():
    print("=" * 60)
    print("STEP 6: Splitting validators into domain files")
    print("=" * 60)
    vd = BASE / "shared" / "validators"

    files = {
        "auth.ts": '''/**
 * @file shared/validators/auth.ts
 * @description Zod validation schemas for auth payloads.
 */
import { z } from 'zod/v4'

export const loginSchema = z.object({
  action: z.literal('login'),
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  action: z.literal('register'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
})

export const authSchema = z.discriminatedUnion('action', [
  loginSchema,
  registerSchema,
  z.object({ action: z.literal('verify'), userId: z.string().min(1) }),
  z.object({
    action: z.literal('change-password'),
    userId: z.string().min(1),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
])
''',

        "product.ts": '''/**
 * @file shared/validators/product.ts
 * @description Zod validation schemas for product queries.
 */
import { z } from 'zod/v4'

export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'rating', 'popular']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  isFeatured: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  tag: z.string().optional(),
})
''',

        "order.ts": '''/**
 * @file shared/validators/order.ts
 * @description Zod validation schemas for order payloads.
 */
import { z } from 'zod/v4'

export const orderItemSchema = z.object({
  productId: z.string().min(1), variantId: z.string().optional(),
  productName: z.string().min(1), variantName: z.string().optional(),
  sku: z.string().min(1), price: z.number().min(0),
  quantity: z.number().int().min(1), total: z.number().min(0),
  image: z.string().optional(),
})

export const addressSchema = z.object({
  firstName: z.string().min(1), lastName: z.string().min(1),
  street1: z.string().min(1), street2: z.string().optional(),
  city: z.string().min(1), state: z.string().min(1),
  postalCode: z.string().min(1), country: z.string().min(1),
  phone: z.string().optional(),
})

export const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  shippingAddress: addressSchema, billingAddress: addressSchema,
  shippingMethod: z.enum(['Standard', 'Express']).default('Standard'),
  subtotal: z.number().min(0), taxAmount: z.number().min(0),
  shippingAmount: z.number().min(0), discountAmount: z.number().min(0),
  totalAmount: z.number().min(0), couponId: z.string().optional(),
})
''',

        "coupon.ts": '''/**
 * @file shared/validators/coupon.ts
 * @description Zod validation schemas for coupon payloads.
 */
import { z } from 'zod/v4'

export const couponQuerySchema = z.object({
  code: z.string().min(1), subtotal: z.coerce.number().min(0),
})

export const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().min(0),
  minPurchase: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
})
''',

        "admin.ts": '''/**
 * @file shared/validators/admin.ts
 * @description Zod validation schemas for admin panel payloads.
 */
import { z } from 'zod/v4'

export const adminUpdateOrderSchema = z.object({
  action: z.literal('update-order-status'),
  id: z.string().min(1),
  data: z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    message: z.string().optional(),
  }),
})

export const adminUpdateProductSchema = z.object({
  action: z.literal('update-product'),
  id: z.string().min(1),
  data: z.object({
    name: z.string().optional(), price: z.number().min(0).optional(),
    isActive: z.boolean().optional(), isFeatured: z.boolean().optional(),
  }),
})

export const adminToggleUserSchema = z.object({
  action: z.literal('toggle-user'),
  id: z.string().min(1),
  data: z.object({ isActive: z.boolean() }),
})

export const adminApproveReviewSchema = z.object({
  action: z.literal('approve-review'),
  id: z.string().min(1),
  data: z.object({ isApproved: z.boolean() }),
})

export const adminUpdateSettingsSchema = z.object({
  action: z.literal('update-settings'),
  data: z.record(z.string(), z.unknown()),
})

export const adminCreateProductSchema = z.object({
  action: z.literal('create-product'),
  data: z.object({
    name: z.string().min(1), description: z.string().min(1),
    shortDesc: z.string().optional(), price: z.number().min(0),
    comparePrice: z.number().min(0).optional(), categoryId: z.string().min(1),
    brandId: z.string().optional(), stock: z.number().int().min(0).optional(),
    images: z.array(z.string()).optional(),
  }),
})

export const adminActionSchema = z.discriminatedUnion('action', [
  adminUpdateOrderSchema, adminUpdateProductSchema, adminToggleUserSchema,
  adminApproveReviewSchema, adminUpdateSettingsSchema, adminCreateProductSchema,
])
''',

        "address.ts": '''/**
 * @file shared/validators/address.ts
 * @description Zod validation schemas for address payloads.
 */
import { z } from 'zod/v4'

export const createAddressSchema = z.object({
  userId: z.string().min(1), label: z.string().max(50).optional(),
  firstName: z.string().min(1), lastName: z.string().min(1),
  street1: z.string().min(1), street2: z.string().optional(),
  city: z.string().min(1), state: z.string().min(1),
  postalCode: z.string().min(1), country: z.string().min(1),
  phone: z.string().optional(), isDefault: z.boolean().default(false),
})
''',

        "review.ts": '''/**
 * @file shared/validators/review.ts
 * @description Zod validation schemas for review payloads.
 */
import { z } from 'zod/v4'

export const createReviewSchema = z.object({
  userId: z.string().min(1), productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(), content: z.string().max(2000).optional(),
})
''',
    }

    for fn, content in files.items():
        (vd / fn).write_text(content.strip() + '\n', encoding='utf-8')
        print(f"  + shared/validators/{fn}")

    barrel = '''/**
 * @file shared/validators/index.ts
 * @description Barrel export for all shared validators.
 */

export { loginSchema, registerSchema, authSchema } from './auth'
export { productQuerySchema } from './product'
export { orderItemSchema, addressSchema, createOrderSchema } from './order'
export { couponQuerySchema, createCouponSchema } from './coupon'
export {
  adminUpdateOrderSchema, adminUpdateProductSchema, adminToggleUserSchema,
  adminApproveReviewSchema, adminUpdateSettingsSchema, adminCreateProductSchema,
  adminActionSchema,
} from './admin'
export { createAddressSchema } from './address'
export { createReviewSchema } from './review'
'''
    (vd / "index.ts").write_text(barrel.strip() + '\n', encoding='utf-8')
    print(f"  + shared/validators/index.ts (barrel)")
    print()


def create_module_barrels():
    print("=" * 60)
    print("STEP 7: Creating barrel exports for modules")
    print("=" * 60)

    barrels = {
        "modules/auth/index.ts": '''/**
 * @file modules/auth/index.ts
 * @description Barrel export for the Auth module.
 */
export { LoginPage, RegisterPage } from './components/auth-pages'
export { useAuthStore } from './stores/auth-store'
export { authService } from './services/auth.service'
export { AuthRepository } from './repositories/auth.repository'
export type {
  LoginRequestDTO, RegisterRequestDTO, VerifySessionRequestDTO,
  ChangePasswordRequestDTO, AuthRequestDTO, UserDTO, AuthResponseDTO,
  ChangePasswordResponseDTO,
} from './dto/auth.dto'
''',

        "modules/products/index.ts": '''/**
 * @file modules/products/index.ts
 * @description Barrel export for the Products module.
 */
export { ProductsPage } from './components/products-page'
export { ProductDetailPage } from './components/product-detail-page'
export { productService } from './services/product.service'
export { ProductRepository } from './repositories/product.repository'
export type {
  ProductListQueryDTO, ProductDetailQueryDTO, CreateProductDTO,
  UpdateProductDTO, ProductListItemDTO, ProductDetailDTO,
  ProductVariantDTO, ReviewDTO, PaginatedProductsDTO,
} from './dto/product.dto'
''',

        "modules/orders/index.ts": '''/**
 * @file modules/orders/index.ts
 * @description Barrel export for the Orders module.
 */
export { orderService } from './services/order.service'
export { OrderRepository } from './repositories/order.repository'
export type {
  OrderItemInputDTO, AddressDTO, CreateOrderRequestDTO,
  UpdateOrderStatusDTO, OrderItemDTO, OrderTimelineDTO, OrderDTO, OrderListDTO,
} from './dto/order.dto'
''',

        "modules/cart/index.ts": '''/**
 * @file modules/cart/index.ts
 * @description Barrel export for the Cart module.
 */
export { CartPage } from './components/cart-page'
export { useCartStore } from './stores/cart-store'
''',

        "modules/checkout/index.ts": '''/**
 * @file modules/checkout/index.ts
 * @description Barrel export for the Checkout module.
 */
export { CheckoutPage } from './components/checkout-page'
''',

        "modules/account/index.ts": '''/**
 * @file modules/account/index.ts
 * @description Barrel export for the Account module.
 */
export { AccountLayout } from './components/account-layout'
export { AccountDashboard } from './components/account-dashboard'
export { AccountOrders, OrderDetailPage } from './components/account-orders'
export { AccountWishlist } from './components/account-wishlist'
export { AccountAddresses } from './components/account-addresses'
export { AccountSettings } from './components/account-settings'
''',

        "modules/admin/index.ts": '''/**
 * @file modules/admin/index.ts
 * @description Barrel export for the Admin module.
 */
export { AdminPage } from './components/admin-page'
export { AdminDashboard } from './components/admin-dashboard'
export { AdminProducts } from './components/admin-products'
export { AdminOrders } from './components/admin-orders'
export { AdminCustomers } from './components/admin-customers'
export { AdminCoupons } from './components/admin-coupons'
export { AdminReviews } from './components/admin-reviews'
export { AdminSettings } from './components/admin-settings'
export { adminService } from './services/admin.service'
''',

        "modules/coupons/index.ts": '''/**
 * @file modules/coupons/index.ts
 * @description Barrel export for the Coupons module.
 */
export { couponService } from './services/coupon.service'
export type {
  ValidateCouponRequestDTO, CreateCouponRequestDTO, CouponDTO, CouponValidationDTO,
} from './dto/coupon.dto'
''',

        "modules/wishlist/index.ts": '''/**
 * @file modules/wishlist/index.ts
 * @description Barrel export for the Wishlist module.
 */
export { useWishlistStore } from './stores/wishlist-store'
''',

        "shared/index.ts": '''/**
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
''',

        "infrastructure/index.ts": '''/**
 * @file infrastructure/index.ts
 * @description Barrel export for infrastructure.
 */
export { db } from './database'
export { BaseRepository } from './base-repository'
''',
    }

    for rel, content in barrels.items():
        fp = BASE / rel
        fp.parent.mkdir(parents=True, exist_ok=True)
        fp.write_text(content.strip() + '\n', encoding='utf-8')
        print(f"  + {rel}")
    print()


def cleanup_old_dirs():
    print("=" * 60)
    print("STEP 8: Cleaning up old directories")
    print("=" * 60)

    old_dirs = ["components/pages", "features", "stores", "hooks", "lib", "types"]

    for d in old_dirs:
        full = BASE / d
        if full.exists():
            try:
                shutil.rmtree(full)
                print(f"  - {d}/")
            except Exception as e:
                print(f"  WARN: {d}/: {e}")
        else:
            print(f"  Already gone: {d}/")

    # Check components/ui
    old_ui = BASE / "components" / "ui"
    if old_ui.exists():
        try:
            shutil.rmtree(old_ui)
            print(f"  - components/ui/")
        except Exception as e:
            print(f"  WARN components/ui/: {e}")

    # Remove components/ if empty
    comp = BASE / "components"
    if comp.exists():
        remaining = [f for f in comp.rglob("*") if f.is_file()]
        if not remaining:
            try:
                shutil.rmtree(comp)
                print(f"  - components/ (empty)")
            except Exception as e:
                print(f"  WARN components/: {e}")
        else:
            print(f"  WARN components/ has {len(remaining)} leftover files")
    print()


def main():
    print()
    print("=" * 60)
    print("  ShopForge Modular Restructuring")
    print("=" * 60)
    print()

    create_directories()
    move_files()
    split_types_file()
    split_constants_file()
    split_validators_file()
    create_module_barrels()
    update_all_imports()
    cleanup_old_dirs()

    print()
    print("=" * 60)
    print("  Restructuring Complete!")
    print("  Run `bun run lint` to verify.")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()
