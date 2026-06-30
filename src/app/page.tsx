/**
 * @file page.tsx
 * @description Client-side router component that acts as the single entry point for the
 * ShopForge application. Instead of using Next.js file-system routing, this component
 * reads the current route from a Zustand store and conditionally renders the matching
 * page component. This approach keeps the entire app under a single URL (`/`), which
 * simplifies deployment and avoids SSR complexity for a client-heavy e-commerce SPA.
 *
 * Key Responsibilities:
 * - Reads `currentRoute` and `params` from the global router Zustand store
 * - Maps route identifiers to their corresponding page components via a switch statement
 * - Wraps customer-facing pages in a standard layout (Header + Footer)
 * - Renders admin pages without Header/Footer so the admin dashboard has its own layout
 * - Generates a composite `pageKey` from route + params to force component remounting
 *   on navigation changes, ensuring clean state on every route transition
 */

'use client'

import { useRouterStore } from "@/shared/stores/router-store"
import { Header } from "@/shared/components/layout/header"
import { Footer } from "@/shared/components/layout/footer"
import HomePage from "@/shared/components/home/home-page"
import ProductsPage from "@/modules/products/components/products-page"
import ProductDetailPage from "@/modules/products/components/product-detail-page"
import CartPage from "@/modules/cart/components/cart-page"
import CheckoutPage from "@/modules/checkout/components/checkout-page"
import { LoginPage, RegisterPage } from "@/modules/auth/components/auth-pages"
import {
  AccountPage,
  AccountOrdersPage,
  AccountOrderDetailPage,
  AccountWishlistPage,
  AccountAddressesPage,
  AccountSettingsPage,
} from "@/modules/account/components/account-pages"
import { AdminPage } from "@/modules/admin/components/admin-page"

/**
 * Set of route identifiers that belong to the admin section.
 * Admin routes are rendered without the standard Header/Footer so the
 * admin dashboard can provide its own sidebar-based navigation layout.
 */
const ADMIN_ROUTES = new Set([
  'admin',
  'admin-products',
  'admin-orders',
  'admin-customers',
  'admin-coupons',
  'admin-reviews',
  'admin-settings',
  'admin-analytics',
  'admin-banners',
])

/**
 * Home — the root page component and client-side router for the entire application.
 *
 * It reads the active route from the Zustand router store and renders the
 * corresponding page component. A composite key derived from the route and
 * its parameters forces React to fully remount the page component whenever
 * the user navigates, preventing stale state from leaking between pages.
 *
 * @returns The rendered page wrapped in the appropriate layout (customer or admin)
 */
export default function Home() {
  /** Current route identifier, e.g. 'home', 'products', 'admin' */
  const currentRoute = useRouterStore((s) => s.currentRoute)
  /** Route parameters such as product id, search query, category filter, etc. */
  const params = useRouterStore((s) => s.params)

  /**
   * Composite key built from the route and all relevant parameters.
   * Using this as a React `key` prop forces a full component remount whenever
   * any navigation parameter changes. This is critical because:
   * - It resets local component state (scroll position, form inputs, etc.)
   * - It triggers data-fetching hooks (useEffect) to re-run with new params
   * - It prevents UI flicker where a previous page's data briefly appears
   */
  const pageKey = `${currentRoute}-${params.search || ''}-${params.categoryId || ''}-${params.brandId || ''}-${params.sort || ''}-${params.isFeatured || ''}-${params.tag || ''}-${params.id || ''}-${params.orderId || ''}-${params.action || ''}`

  /** Whether the current route belongs to the admin section */
  const isAdminRoute = ADMIN_ROUTES.has(currentRoute)

  /**
   * Renders the page component that matches the current route.
   *
   * Routes are grouped into three categories:
   * 1. Customer Routes — product browsing, cart, checkout, auth, and account management
   * 2. Admin Routes — all routes in the ADMIN_ROUTES set, rendered via a single AdminPage
   *    component that handles its own internal sub-routing
   * 3. Default — falls through to the HomePage for the 'home' route or any unrecognized route
   *
   * @returns The React element for the matching page component
   */
  const renderPage = () => {
    switch (currentRoute) {
      // ---- Customer Routes ----
      case 'products':
        return <ProductsPage key={pageKey} />
      case 'product-detail':
        return <ProductDetailPage key={pageKey} />
      case 'cart':
        return <CartPage />
      case 'checkout':
        return <CheckoutPage />
      case 'login':
        return <LoginPage />
      case 'register':
        return <RegisterPage />
      case 'account':
        return <AccountPage />
      case 'account-orders':
        return <AccountOrdersPage />
      case 'account-order-detail':
        return <AccountOrderDetailPage key={pageKey} />
      case 'account-wishlist':
        return <AccountWishlistPage />
      case 'account-addresses':
        return <AccountAddressesPage />
      case 'account-settings':
        return <AccountSettingsPage />

      // ---- Admin Routes ----
      /** All admin sub-routes delegate to AdminPage which manages its own internal routing */
      case 'admin':
      case 'admin-analytics':
      case 'admin-products':
      case 'admin-orders':
      case 'admin-customers':
      case 'admin-coupons':
      case 'admin-reviews':
      case 'admin-settings':
      case 'admin-banners':
        return <AdminPage />

      // ---- Default ----
      /** Fall through to HomePage for the root route or any unmatched route identifier */
      case 'home':
      default:
        return <HomePage />
    }
  }

  // Admin pages have their own layout (no header/footer)
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-background">
        {renderPage()}
      </div>
    )
  }

  // Customer pages with standard layout
  /** Customer-facing pages are wrapped with Header and Footer for consistent navigation.
   *  The flex layout ensures the Footer always sticks to the bottom even on short pages. */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
    </div>
  )
}
