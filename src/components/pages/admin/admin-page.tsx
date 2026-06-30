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
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { useIsMobile } from '@/hooks/use-mobile'
import type { RoutePath } from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

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

export const NAV_ITEMS: { icon: typeof LayoutDashboard; label: string; route: RoutePath }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', route: 'admin' },
  { icon: Package, label: 'Products', route: 'admin-products' },
  { icon: ShoppingCart, label: 'Orders', route: 'admin-orders' },
  { icon: Users, label: 'Customers', route: 'admin-customers' },
  { icon: Tag, label: 'Coupons', route: 'admin-coupons' },
  { icon: Star, label: 'Reviews', route: 'admin-reviews' },
  { icon: Settings, label: 'Settings', route: 'admin-settings' },
]

export const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

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

export function StatusBadge({ status }: { status: string }) {
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
    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
        {status}
      </span>
    )
  }
  return <Badge variant={getStatusBadgeVariant(status)}>{status}</Badge>
}

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
      {count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  )
}

// ============================================================================
// Admin Layout (shared sidebar + topbar)
// ============================================================================

function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const { currentRoute, navigate } = useRouterStore()
  const { user, logout } = useAuthStore()
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)

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

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
          <Store className="h-4 w-4 text-white" />
        </div>
        <span className="text-lg font-bold text-white">ShopForge</span>
      </div>
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.route
            return (
              <button
                key={item.route}
                onClick={() => {
                  navigate(item.route)
                  setMobileOpen(false)
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
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-gray-900">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile sidebar via Sheet */}
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

      {/* Main content */}
      <div className={`flex flex-1 flex-col ${isMobile ? '' : 'ml-64'}`}>
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            {isMobile && <div className="w-10" />}
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="bg-gray-900 text-white text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
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

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

// ============================================================================
// AdminPage - Single entry point that renders layout + content
// ============================================================================

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

export function AdminPage() {
  const currentRoute = useRouterStore((s) => s.currentRoute)

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
