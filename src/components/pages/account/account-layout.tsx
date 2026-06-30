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
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { useIsMobile } from '@/hooks/use-mobile'
import type { RoutePath } from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

// ============================================================================
// Types
// ============================================================================

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

export const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  PAID: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PROCESSING: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  SHIPPED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

export const ORDER_STATUS_STEPS = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED']

// ============================================================================
// Helper: Auth Guard
// ============================================================================

export function useAuthGuard() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useRouterStore((s) => s.navigate)

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

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

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

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useRouterStore((s) => s.navigate)
  const currentRoute = useRouterStore((s) => s.currentRoute)
  const isMobile = useIsMobile()

  const handleLogout = () => {
    logout()
    navigate('home')
  }

  if (!user) return null

  // Mobile: horizontal scrollable tab bar
  if (isMobile) {
    return (
      <div className="space-y-4">
        {/* Mobile Tab Bar */}
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

        {/* User info strip */}
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

        {/* Content */}
        <div className="px-4 pb-6">{children}</div>
      </div>
    )
  }

  // Desktop: sidebar + content
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0">
          <div className="sticky top-24 space-y-6">
            {/* User Card */}
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

            {/* Nav Links */}
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
                    {isActive && <ChevronRight className="ml-auto size-4" />}
                  </Button>
                )
              })}
            </nav>

            <Separator />

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

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
