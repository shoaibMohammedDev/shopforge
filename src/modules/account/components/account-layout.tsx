/**
 * @file account-layout.tsx
 * @description Shared layout, types, constants, and utility helpers for the account
 * section of the ShopForge e-commerce application. Provides the sidebar navigation
 * (desktop) and tab bar (mobile), as well as reusable types and formatting functions
 * consumed by all account sub-pages.
 *
 * @keyfeatures
 * - Shared OrderWithItems type used across order-related components
 * - Sidebar navigation links configuration (SIDEBAR_LINKS)
 * - Status color mapping for order/payment badges (STATUS_COLORS)
 * - Order status progression steps (ORDER_STATUS_STEPS)
 * - Authentication guard hook (useAuthGuard)
 * - Currency and date formatting utilities
 * - Responsive AccountLayout with desktop sidebar and mobile tab bar
 */
'use client'

import { useEffect } from 'react'
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useRouterStore } from "@/shared/stores/router-store"
import { useAuthStore } from "@/modules/auth/stores/auth-store"
import { useIsMobile } from "@/shared/hooks/use-mobile"
import type { RoutePath } from "@/shared/types"

import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
} from "@/shared/components/ui/card"
import { Separator } from "@/shared/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar"
import { ScrollArea } from "@/shared/components/ui/scroll-area"

// ============================================================================
// Types
// ============================================================================

/**
 * @interface OrderWithItems
 * @description Represents a complete order with its line items, payment info,
 * and status timeline. Used by the order list and order detail pages to render
 * order information consistently across the account section.
 *
 * @property {string} id - Unique order identifier (UUID)
 * @property {string} orderNumber - Human-readable order number (e.g. "ORD-2024-001")
 * @property {string} status - Current order status (PENDING, PAID, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED)
 * @property {number} subtotal - Order subtotal before tax, shipping, and discounts
 * @property {number} taxAmount - Total tax applied to the order
 * @property {number} shippingAmount - Shipping cost for the order
 * @property {number} discountAmount - Discount amount applied via coupon
 * @property {number} totalAmount - Final total amount after all adjustments
 * @property {string | null} shippingMethod - Selected shipping method name
 * @property {string | null} trackingNumber - Carrier tracking number once shipped
 * @property {string} shippingAddress - JSON-encoded shipping address
 * @property {string} billingAddress - JSON-encoded billing address
 * @property {string} createdAt - ISO 8601 timestamp of order creation
 * @property {Object[]} items - Array of order line items
 * @property {Object} [payment] - Optional payment information
 * @property {Object[]} [timeline] - Optional status timeline entries
 */
export interface OrderWithItems {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  shippingMethod: string | null
  trackingNumber: string | null
  shippingAddress: string
  billingAddress: string
  createdAt: string
  items: {
    id: string
    productId: string
    productName: string
    variantName: string | null
    sku: string
    price: number
    quantity: number
    total: number
    image: string | null
  }[]
  payment?: {
    status: string
    method: string
  } | null
  timeline?: {
    id: string
    status: string
    message: string | null
    createdAt: string
  }[]
}

// ============================================================================
// Constants
// ============================================================================

/**
 * @constant SIDEBAR_LINKS
 * @description Navigation links displayed in the account sidebar (desktop) and
 * tab bar (mobile). Each entry maps to a route path and includes a Lucide icon
 * for visual identification.
 *
 * @type {{ label: string; route: RoutePath; icon: React.ElementType }[]}
 */
export const SIDEBAR_LINKS: {
  label: string
  route: RoutePath
  icon: React.ElementType
}[] = [
  { label: 'Dashboard', route: 'account', icon: LayoutDashboard },
  { label: 'Orders', route: 'account-orders', icon: Package },
  { label: 'Wishlist', route: 'account-wishlist', icon: Heart },
  { label: 'Addresses', route: 'account-addresses', icon: MapPin },
  { label: 'Settings', route: 'account-settings', icon: Settings },
]

/**
 * @constant STATUS_COLORS
 * @description Maps order/payment status strings to Tailwind CSS class strings
 * for colored badge rendering. Supports both light and dark mode variants.
 *
 * @type {Record<string, string>}
 */
export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  SHIPPED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

/**
 * @constant ORDER_STATUS_STEPS
 * @description Ordered array of status steps representing the typical lifecycle
 * of an order from creation to delivery. Used to render the status timeline
 * progress indicator on the order detail page.
 *
 * @type {string[]}
 */
export const ORDER_STATUS_STEPS = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']

// ============================================================================
// Helper: Auth Guard
// ============================================================================

/**
 * @function useAuthGuard
 * @description Custom hook that protects account pages by redirecting
 * unauthenticated users to the login page. Returns the current authentication
 * state so components can conditionally render content.
 *
 * @returns {boolean} Whether the user is currently authenticated
 *
 * @example
 * ```tsx
 * const isAuthenticated = useAuthGuard()
 * if (!isAuthenticated) return null
 * ```
 */
export function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useRouterStore((s) => s.navigate)

  // Redirect to login page if the user is not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('login')
    }
  }, [isAuthenticated, navigate])

  return isAuthenticated
}

// ============================================================================
// Helper: Format currency
// ============================================================================

/**
 * @function formatCurrency
 * @description Formats a numeric amount as a USD currency string using the
 * Intl.NumberFormat API. Used consistently across all account pages to display
 * prices, totals, and discounts.
 *
 * @param {number} amount - The numeric amount to format
 * @returns {string} Formatted currency string (e.g. "$1,234.56")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * @function formatDate
 * @description Formats an ISO 8601 date string into a human-readable format
 * using the US locale. Used for displaying order dates, review dates, etc.
 *
 * @param {string} dateStr - ISO 8601 date string (e.g. "2024-01-15T10:30:00Z")
 * @returns {string} Formatted date string (e.g. "Jan 15, 2024")
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * @function getInitials
 * @description Extracts up to 2 uppercase initials from a user's full name.
 * Used as the fallback content for avatar components when no profile image
 * is available.
 *
 * @param {string | null} name - The user's full name, or null
 * @returns {string} Up to 2 uppercase initials (e.g. "JD" for "John Doe"),
 *   or "U" if name is null/empty
 */
export function getInitials(name: string | null): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ============================================================================
// Shared Layout: AccountLayout
// ============================================================================

/**
 * @function AccountLayout
 * @description Shared layout wrapper for all account pages. Renders a responsive
 * sidebar navigation on desktop and a horizontal scrollable tab bar on mobile.
 * Includes the user's avatar, name, and email in both layouts, plus a logout
 * button.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The page content to render inside the layout
 *
 * @state
 * - Reads `user` and `logout` from useAuthStore for user info and logout action
 * - Reads `navigate` and `currentRoute` from useRouterStore for navigation and active state
 * - Uses `useIsMobile()` hook to determine responsive layout variant
 *
 * @remarks
 * - Returns `null` if no user is authenticated (should be guarded by useAuthGuard)
 * - Desktop: 264px fixed sidebar with user card + nav links on the left, content on the right
 * - Mobile: Sticky horizontal tab bar at the top, compact user info strip below, then content
 */
export function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useRouterStore((s) => s.navigate)
  const currentRoute = useRouterStore((s) => s.currentRoute)
  const isMobile = useIsMobile()

  /**
   * Handles user logout: clears auth state and redirects to the home page.
   */
  const handleLogout = () => {
    logout()
    navigate('home')
  }

  // Guard: don't render layout if no user is available
  if (!user) return null

  // Mobile: horizontal scrollable tab bar
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Tab Bar - sticky horizontal navigation with scrollable tabs */}
        <div className="sticky top-16 z-40 bg-background border-b">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex items-center gap-1 px-4 py-2">
              {SIDEBAR_LINKS.map((link) => {
                const Icon = link.icon
                const isActive = currentRoute === link.route
                return (
                  <Button
                    key={link.route}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="shrink-0 gap-1.5"
                    onClick={() => navigate(link.route)}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Button>
                )
              })}
              {/* Logout button in mobile tab bar */}
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 text-destructive hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Logout
              </Button>
            </div>
          </ScrollArea>
        </div>

        {/* User info strip - compact avatar + name/email below the tab bar */}
        <div className="flex items-center gap-3 px-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name || 'User'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Content - the actual page content passed as children */}
        <div className="px-4 pb-6">{children}</div>
      </div>
    )
  }

  // Desktop: sidebar + content layout
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Sidebar - fixed-width left panel with user card and navigation */}
        <aside className="w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* User Card - displays avatar, name, and email */}
            <Card>
              <CardContent className="p-6 text-center">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold">{user.name || 'User'}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </CardContent>
            </Card>

            {/* Nav Links - vertical list of sidebar navigation items */}
            <nav className="space-y-1">
              {SIDEBAR_LINKS.map((link) => {
                const Icon = link.icon
                const isActive = currentRoute === link.route
                return (
                  <Button
                    key={link.route}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-3"
                    onClick={() => navigate(link.route)}
                  >
                    <Icon className="size-4" />
                    {link.label}
                    {/* Chevron indicator for the currently active route */}
                    {isActive && <ChevronRight className="ml-auto size-4" />}
                  </Button>
                )
              })}
            </nav>

            <Separator />

            {/* Logout button at the bottom of the sidebar */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Content - main content area that expands to fill remaining space */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
