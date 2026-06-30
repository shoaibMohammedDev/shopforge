/**
 * @file admin-page.tsx
 * @description Main admin page router and shared layout for the ShopForge
 * e-commerce admin dashboard. Provides the AdminLayout wrapper (sidebar +
 * topbar), shared constants, utility functions, and the main AdminPage
 * component that routes to the correct sub-page content based on the
 * current route.
 *
 * @keyfeatures
 * - Admin role-based access control (redirects non-admin users)
 * - Responsive sidebar navigation (fixed on desktop, Sheet on mobile)
 * - Shared navigation items configuration (NAV_ITEMS)
 * - Shared utility functions (formatCurrency, formatDate, getStatusBadgeVariant)
 * - Reusable UI components (StatusBadge, StarRating)
 * - Pie chart color palette (PIE_COLORS)
 * - Route-based content rendering via AdminPage component
 */
'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Star,
  Settings,
  Menu,
  LogOut,
  Store,
  AlertTriangle,
} from 'lucide-react'
import { useRouterStore } from "@/shared/stores/router-store"
import { useAuthStore } from "@/modules/auth/stores/auth-store"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import type { RoutePath } from "@/shared/types"

import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet"

import { AdminDashboardContent } from './admin-dashboard'
import { AdminProductsContent } from './admin-products'
import { AdminOrdersContent } from './admin-orders'
import { AdminCustomersContent } from './admin-customers'
import { AdminCouponsContent } from './admin-coupons'
import { AdminReviewsContent } from './admin-reviews'
import { AdminSettingsContent } from './admin-settings'

// ============================================================================
// Constants & Helpers (shared across admin sub-files)
// ============================================================================

/**
 * @constant NAV_ITEMS
 * @description Navigation items displayed in the admin sidebar. Each item
 * defines an icon, label, and the route path it navigates to. Used by
 * both the desktop sidebar and the mobile sheet navigation.
 *
 * @type {{ icon: typeof LayoutDashboard; label: string; route: RoutePath }[]}
 */
export const NAV_ITEMS: { icon: typeof LayoutDashboard; label: string; route: RoutePath }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', route: 'admin' },
  { icon: Package, label: 'Products', route: 'admin-products' },
  { icon: ShoppingCart, label: 'Orders', route: 'admin-orders' },
  { icon: Users, label: 'Customers', route: 'admin-customers' },
  { icon: Tag, label: 'Coupons', route: 'admin-coupons' },
  { icon: Star, label: 'Reviews', route: 'admin-reviews' },
  { icon: Settings, label: 'Settings', route: 'admin-settings' },
]

/**
 * @constant PIE_COLORS
 * @description Color palette used for pie chart segments in the admin dashboard.
 * Provides distinct, accessible colors for different data categories.
 *
 * @type {string[]}
 */
export const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

/**
 * @function formatCurrency
 * @description Formats a numeric value as a USD currency string using the
 * Intl.NumberFormat API. Shared across all admin sub-pages for consistent
 * currency display.
 *
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g. "$1,234.56")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

/**
 * @function formatDate
 * @description Formats an ISO 8601 date string into a human-readable format.
 * Shared across all admin sub-pages for consistent date display.
 *
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string} Formatted date string (e.g. "Jan 15, 2024")
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * @function getStatusBadgeVariant
 * @description Maps a status string to a Badge variant for consistent styling
 * across the admin section. Falls back to 'outline' for unknown statuses.
 *
 * @param {string} status - The status string to map
 * @returns {'default' | 'secondary' | 'destructive' | 'outline'} The corresponding Badge variant
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING: 'secondary',
    PAID: 'default',
    PROCESSING: 'default',
    SHIPPED: 'default',
    DELIVERED: 'default',
    CANCELLED: 'destructive',
    REFUNDED: 'destructive',
    ACTIVE: 'default',
    INACTIVE: 'secondary',
    DRAFT: 'outline',
    Approved: 'default',
    Rejected: 'destructive',
    Pending: 'secondary',
  }
  return map[status] || 'outline'
}

/**
 * @function StatusBadge
 * @description Renders a status indicator badge with custom background colors
 * for known statuses, falling back to a standard Badge component for unknown
 * statuses. Used throughout the admin section for order, product, customer,
 * coupon, and review status display.
 *
 * @param {Object} props - Component props
 * @param {string} props.status - The status string to render as a badge
 */
export function StatusBadge({ status }: { status: string }) {
  // Color mapping for known statuses with light-mode hover states
  const colorMap: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    PAID: 'bg-green-100 text-green-800 hover:bg-green-100',
    PROCESSING: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    SHIPPED: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
    DELIVERED: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    CANCELLED: 'bg-red-100 text-red-800 hover:bg-red-100',
    REFUNDED: 'bg-red-100 text-red-800 hover:bg-red-100',
    ACTIVE: 'bg-green-100 text-green-800 hover:bg-green-100',
    INACTIVE: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    Approved: 'bg-green-100 text-green-800 hover:bg-green-100',
    Rejected: 'bg-red-100 text-red-800 hover:bg-red-100',
    Pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  }
  const cls = colorMap[status] || ''
  if (cls) {
    // Use custom colored span for known statuses
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
        {status}
      </span>
    )
  }
  // Fallback to standard Badge component for unknown statuses
  return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
}

/**
 * @function StarRating
 * @description Renders a visual star rating display (1-5 stars) with optional
 * review count. Filled stars use amber color for active rating, gray for
 * inactive. Used in the admin reviews section and product displays.
 *
 * @param {Object} props - Component props
 * @param {number} props.rating - The numeric rating value (0-5)
 * @param {number} [props.count] - Optional review count to display in parentheses
 */
export function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= Math.round(rating)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      {/* Optional review count display */}
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  )
}

// ============================================================================
// Admin Layout (shared sidebar + topbar)
// ============================================================================

/**
 * @function AdminLayout
 * @description Shared layout wrapper for all admin pages. Provides a dark
 * sidebar with navigation links on desktop and a slide-out Sheet on mobile.
 * Includes an access control check that renders an "Access Denied" card for
 * non-admin users.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The page content to render inside the layout
 * @param {string} props.title - The title displayed in the top bar header
 *
 * @state
 * - `currentRoute` and `navigate` from useRouterStore for navigation and active state
 * - `user` and `logout` from useAuthStore for user info and auth actions
 * - `isMobile` from useIsMobile hook for responsive layout determination
 * - `mobileOpen` local state for mobile Sheet open/close toggle
 *
 * @remarks
 * - Renders an "Access Denied" card if the current user's role is not 'ADMIN'
 * - Desktop: 264px fixed dark sidebar on the left, main content offset by ml-64
 * - Mobile: hamburger menu button triggers a left-side Sheet with the same sidebar content
 * - Top bar shows the page title and user avatar with logout button
 */
function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { currentRoute, navigate } = useRouterStore()
  const { user, logout } = useAuthStore()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Access control: render denied card for non-admin users
  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('home')} variant="outline">
              <Store className="mr-2 h-4 w-4" />
              Back to Store
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Sidebar content - shared between desktop and mobile Sheet
  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand header with ShopForge logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Store className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-white">ShopForge</span>
      </div>
      {/* Navigation links - scrollable when content overflows */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.route
            return (
              <button
                key={item.route}
                onClick={() => {
                  navigate(item.route)
                  setMobileOpen(false) // Close mobile sheet on navigation
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full text-left ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </ScrollArea>
      {/* Back to Store link at the bottom of the sidebar */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={() => navigate('home')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Store className="h-5 w-5 shrink-0" />
          Back to Store
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar - fixed position dark panel */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile sidebar via Sheet - slide-out drawer triggered by hamburger menu */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-3 z-40 bg-gray-900 text-white hover:bg-gray-800 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-gray-900 p-0 border-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
            </SheetHeader>
            {sidebarContent}
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area - offset by sidebar width on desktop */}
      <div className={`flex flex-1 flex-col ${isMobile ? '' : 'ml-64'}`}>
        {/* Top bar - sticky header with page title, user info, and logout */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Spacer for mobile hamburger menu button */}
            {isMobile && <div className="w-10" />}
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* User info - hidden on small screens */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            {/* User avatar */}
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="bg-gray-900 text-white text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            {/* Logout button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout()
                navigate('home')
              }}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Page content - rendered by the AdminPage router */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

// ============================================================================
// AdminPage - Single entry point that renders layout + content
// ============================================================================

/**
 * @function getAdminTitle
 * @description Maps a route path to a human-readable page title for display
 * in the admin top bar header.
 *
 * @param {RoutePath} route - The current route path
 * @returns {string} The page title to display in the header
 */
function getAdminTitle(route: RoutePath): string {
  switch (route) {
    case 'admin':
    case 'admin-analytics':
    case 'admin-banners':
      return 'Dashboard'
    case 'admin-products':
      return 'Products'
    case 'admin-orders':
      return 'Orders'
    case 'admin-customers':
      return 'Customers'
    case 'admin-coupons':
      return 'Coupons'
    case 'admin-reviews':
      return 'Reviews'
    case 'admin-settings':
      return 'Settings'
    default:
      return 'Dashboard'
  }
}

/**
 * @function AdminPage
 * @description Main admin page component that acts as a router. Reads the
 * current route from the router store and renders the appropriate admin
 * sub-page content inside the shared AdminLayout wrapper.
 *
 * @state
 * - `currentRoute` from useRouterStore - determines which admin sub-page to render
 *
 * @remarks
 * - Default and unrecognized routes render the AdminDashboardContent
 * - The layout title is dynamically set based on the current route
 */
export function AdminPage() {
  const currentRoute = useRouterStore((s) => s.currentRoute)

  /**
   * Renders the appropriate admin sub-page content based on the current route.
   * Falls back to the dashboard for unrecognized routes.
   */
  const renderContent = () => {
    switch (currentRoute) {
      case 'admin-products':
        return <AdminProductsContent />
      case 'admin-orders':
        return <AdminOrdersContent />
      case 'admin-customers':
        return <AdminCustomersContent />
      case 'admin-coupons':
        return <AdminCouponsContent />
      case 'admin-reviews':
        return <AdminReviewsContent />
      case 'admin-settings':
        return <AdminSettingsContent />
      case 'admin':
      case 'admin-analytics':
      case 'admin-banners':
      default:
        return <AdminDashboardContent />
    }
  }

  return (
    <AdminLayout title={getAdminTitle(currentRoute)}>
      {renderContent()}
    </AdminLayout>
  )
}
