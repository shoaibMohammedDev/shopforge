'use client'

import { useRouterStore } from '@/stores/router-store'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import HomePage from '@/components/pages/home/home-page'
import ProductsPage from '@/components/pages/products/products-page'
import ProductDetailPage from '@/components/pages/products/product-detail-page'
import CartPage from '@/components/pages/cart/cart-page'
import CheckoutPage from '@/components/pages/checkout/checkout-page'
import { LoginPage, RegisterPage } from '@/components/pages/auth/auth-pages'
import {
  AccountPage,
  AccountOrdersPage,
  AccountOrderDetailPage,
  AccountWishlistPage,
  AccountAddressesPage,
  AccountSettingsPage,
} from '@/components/pages/account/account-pages'
import { AdminPage } from '@/components/pages/admin/admin-pages'

// Admin routes use their own layout (no header/footer)
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

export default function Home() {
  const currentRoute = useRouterStore((s) => s.currentRoute)
  const params = useRouterStore((s) => s.params)

  // Use a key based on route + relevant params to force remount on navigation changes.
  const pageKey = `${currentRoute}-${params.search || ''}-${params.categoryId || ''}-${params.brandId || ''}-${params.sort || ''}-${params.isFeatured || ''}-${params.tag || ''}-${params.id || ''}-${params.orderId || ''}-${params.action || ''}`

  const isAdminRoute = ADMIN_ROUTES.has(currentRoute)

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
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
    </div>
  )
}
