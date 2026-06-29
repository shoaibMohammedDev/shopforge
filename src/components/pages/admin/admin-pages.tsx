'use client'

import { useState, useEffect, useCallback } from 'react'
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from '@/hooks/use-toast'
import type { RoutePath, AdminStats, CouponDisplay } from '@/types'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'

// ============================================================================
// Constants & Helpers
// ============================================================================

const NAV_ITEMS: { icon: typeof LayoutDashboard; label: string; route: RoutePath }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', route: 'admin' },
  { icon: Package, label: 'Products', route: 'admin-products' },
  { icon: ShoppingCart, label: 'Orders', route: 'admin-orders' },
  { icon: Users, label: 'Customers', route: 'admin-customers' },
  { icon: Tag, label: 'Coupons', route: 'admin-coupons' },
  { icon: Star, label: 'Reviews', route: 'admin-reviews' },
  { icon: Settings, label: 'Settings', route: 'admin-settings' },
]

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
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

function StatusBadge({ status }: { status: string }) {
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

function StarRating({ rating, count }: { rating: number; count?: number }) {
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
// AdminDashboardPage
// ============================================================================

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin?action=stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch admin stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const revenueChartConfig: ChartConfig = {
    revenue: { label: 'Revenue', color: '#22c55e' },
  }

  const orderStatusChartConfig: ChartConfig = {
    count: { label: 'Orders' },
    PENDING: { label: 'Pending', color: '#f59e0b' },
    PAID: { label: 'Paid', color: '#22c55e' },
    PROCESSING: { label: 'Processing', color: '#3b82f6' },
    SHIPPED: { label: 'Shipped', color: '#8b5cf6' },
    DELIVERED: { label: 'Delivered', color: '#06b6d4' },
    CANCELLED: { label: 'Cancelled', color: '#ef4444' },
  }

  if (loading) {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </>
    )
  }

  if (!stats) {
    return (
      <>
        <Card className="mx-auto max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-yellow-500" />
            <CardTitle>Unable to Load Dashboard</CardTitle>
            <CardDescription>Please try refreshing the page.</CardDescription>
          </CardHeader>
        </Card>
      </>
    )
  }

  const statCards = [
    {
      title: 'Revenue',
      value: formatCurrency(stats.totalRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      changeColor: stats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Orders',
      value: stats.totalOrders.toLocaleString(),
      change: stats.orderChange,
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      changeColor: stats.orderChange >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Customers',
      value: stats.totalCustomers.toLocaleString(),
      change: stats.customerChange,
      icon: Users,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      changeColor: stats.customerChange >= 0 ? 'text-green-600' : 'text-red-600',
    },
    {
      title: 'Products',
      value: stats.totalProducts.toLocaleString(),
      change: 0,
      icon: Package,
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      changeColor: 'text-gray-500',
    },
  ]

  return (
    <>
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.title}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                  <div className="mt-2 flex items-center gap-1">
                    {card.change > 0 ? (
                      <TrendingUp className={`h-3.5 w-3.5 ${card.changeColor}`} />
                    ) : card.change < 0 ? (
                      <TrendingDown className={`h-3.5 w-3.5 ${card.changeColor}`} />
                    ) : null}
                    <span className={`text-xs font-medium ${card.changeColor}`}>
                      {card.change > 0 ? '+' : ''}
                      {card.change.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-400">vs last month</span>
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Overview</CardTitle>
            <CardDescription>Last 6 months revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-64 w-full">
              <AreaChart data={stats.salesByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  fill="url(#fillRevenue)"
                  strokeWidth={2}
                  name="revenue"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Orders by status pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by Status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={orderStatusChartConfig} className="h-64 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                <Pie
                  data={stats.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="status"
                >
                  {stats.ordersByStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {stats.ordersByStatus.map((item, i) => (
                <div key={item.status} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-gray-600">{item.status}</span>
                  <span className="font-medium text-gray-900">({item.count})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders + Top Products */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                      No orders yet
                    </TableCell>
                  </TableRow>
                ) : (
                  stats.recentOrders.slice(0, 10).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No product data yet</p>
            ) : (
              <div className="space-y-4">
                {stats.topProducts.map((tp, idx) => {
                  const images: string[] = tp.product.images ? JSON.parse(tp.product.images) : []
                  return (
                    <div key={tp.product.id} className="flex items-center gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                        {idx + 1}
                      </span>
                      {images[0] ? (
                        <img
                          src={images[0]}
                          alt={tp.product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                          <Package className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {tp.product.name}
                        </p>
                        <p className="text-xs text-gray-500">{tp.totalSold} units sold</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(tp.revenue)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// ============================================================================
// AdminProductsPage
// ============================================================================

interface AdminProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  images: string
  isActive: boolean
  isFeatured: boolean
  category: { name: string } | null
  brand: { name: string } | null
  inventory: { quantity: number; reserved: number }[]
}

function AdminProductsContent() {
  const { navigate } = useRouterStore()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Add product form state
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formComparePrice, setFormComparePrice] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formBrand, setFormBrand] = useState('')
  const [formStock, setFormStock] = useState('')
  const [formImages, setFormImages] = useState('')

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=products')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setProducts(data)
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.name?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleToggleActive(product: AdminProduct) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-product',
          id: product.id,
          data: { isActive: !product.isActive },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Product ${product.isActive ? 'deactivated' : 'activated'}` })
      fetchProducts()
    } catch {
      toast({ title: 'Failed to update product', variant: 'destructive' })
    }
  }

  async function handleDeleteProduct(id: string) {
    try {
      const res = await fetch(`/api/admin?action=delete-product&id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Product deleted' })
      fetchProducts()
    } catch {
      toast({ title: 'Failed to delete product', variant: 'destructive' })
    }
  }

  async function handleAddProduct() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-product',
          data: {
            name: formName,
            description: formDesc,
            price: parseFloat(formPrice) || 0,
            comparePrice: formComparePrice ? parseFloat(formComparePrice) : null,
            category: formCategory,
            brand: formBrand,
            stock: parseInt(formStock) || 0,
            images: formImages ? formImages.split(',').map((s) => s.trim()) : [],
          },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Product created successfully' })
      setShowAddDialog(false)
      resetForm()
      fetchProducts()
    } catch {
      toast({ title: 'Failed to create product', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setFormName('')
    setFormDesc('')
    setFormPrice('')
    setFormComparePrice('')
    setFormCategory('')
    setFormBrand('')
    setFormStock('')
    setFormImages('')
  }

  return (
    <>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Brand</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden sm:table-cell">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const images: string[] = product.images ? JSON.parse(product.images) : []
                    const totalStock = product.inventory?.reduce((s, inv) => s + inv.quantity, 0) || 0
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          {images[0] ? (
                            <img
                              src={images[0]}
                              alt={product.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm max-w-[200px] truncate">
                            {product.name}
                          </p>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {product.category?.name || '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {product.brand?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">
                              {formatCurrency(product.price)}
                            </span>
                            {product.comparePrice && product.comparePrice > product.price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(product.comparePrice)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span
                            className={`text-sm font-medium ${
                              totalStock <= 10 ? 'text-red-600' : 'text-gray-700'
                            }`}
                          >
                            {totalStock}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate('product-detail', { id: product.id })}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                                {product.isActive ? (
                                  <XCircle className="mr-2 h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {product.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a new product listing.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prod-name">Product Name</Label>
              <Input
                id="prod-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea
                id="prod-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Enter product description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-price">Price</Label>
                <Input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prod-compare">Compare Price</Label>
                <Input
                  id="prod-compare"
                  type="number"
                  step="0.01"
                  value={formComparePrice}
                  onChange={(e) => setFormComparePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-category">Category</Label>
                <Input
                  id="prod-category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Category name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prod-brand">Brand</Label>
                <Input
                  id="prod-brand"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  placeholder="Brand name"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-stock">Stock Quantity</Label>
              <Input
                id="prod-stock"
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-images">Image URLs</Label>
              <Input
                id="prod-images"
                value={formImages}
                onChange={(e) => setFormImages(e.target.value)}
                placeholder="Comma-separated image URLs"
              />
              <p className="text-xs text-gray-500">Separate multiple URLs with commas</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} disabled={saving || !formName || !formPrice}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// AdminOrdersPage
// ============================================================================

interface AdminOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  user: { id: string; name: string | null; email: string } | null
  items: { id: string; productName: string; quantity: number; total: number }[]
  payment: { status: string; method: string } | null
}

function AdminOrdersContent() {
  const { navigate } = useRouterStore()
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [statusDialogOrder, setStatusDialogOrder] = useState<AdminOrder | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchOrders = useCallback(async (status?: string) => {
    setLoading(true)
    try {
      const url = status && status !== 'ALL'
        ? `/api/admin?action=orders&status=${status}`
        : '/api/admin?action=orders'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders(activeTab)
  }, [activeTab, fetchOrders])

  async function handleUpdateStatus() {
    if (!statusDialogOrder || !newStatus) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-order-status',
          id: statusDialogOrder.id,
          data: { status: newStatus },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Order status updated' })
      setStatusDialogOrder(null)
      fetchOrders(activeTab)
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const orderStatuses = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

  return (
    <>
      {/* Filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="flex-wrap h-auto gap-1">
          {orderStatuses.map((status) => (
            <TabsTrigger key={status} value={status} className="text-xs px-3">
              {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Orders table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-sm">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {order.user?.name || order.user?.email || 'Guest'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate('account-order-detail', { id: order.id })}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setStatusDialogOrder(order)
                                setNewStatus(order.status)
                              }}
                            >
                              <ArrowUpDown className="mr-2 h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={!!statusDialogOrder} onOpenChange={(open) => !open && setStatusDialogOrder(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Order #{statusDialogOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="order-status">New Status</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={saving || newStatus === statusDialogOrder?.status}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// AdminCustomersPage
// ============================================================================

interface AdminCustomer {
  id: string
  name: string | null
  email: string
  image: string | null
  isActive: boolean
  createdAt: string
  _count: { orders: number }
  orders: { totalAmount: number }[]
}

function AdminCustomersContent() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null)

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=customers')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCustomers(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  async function handleToggleDisable(customer: AdminCustomer) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-user',
          id: customer.id,
          data: { isActive: !customer.isActive },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Customer ${customer.isActive ? 'disabled' : 'enabled'}` })
      fetchCustomers()
    } catch {
      toast({ title: 'Failed to update customer', variant: 'destructive' })
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Orders</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => {
                    const totalSpent = customer.orders?.reduce((s, o) => s + o.totalAmount, 0) || 0
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={customer.image || undefined} />
                              <AvatarFallback className="text-xs bg-gray-100">
                                {customer.name?.charAt(0)?.toUpperCase() || customer.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{customer.name || 'Unnamed'}</p>
                              <p className="text-xs text-gray-500">{customer.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {customer._count?.orders || 0}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {formatCurrency(totalSpent)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={customer.isActive ? 'ACTIVE' : 'INACTIVE'} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleDisable(customer)}>
                                {customer.isActive ? (
                                  <XCircle className="mr-2 h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {customer.isActive ? 'Disable' : 'Enable'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedCustomer.image || undefined} />
                  <AvatarFallback className="text-lg bg-gray-100">
                    {selectedCustomer.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedCustomer.name || 'Unnamed'}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Orders</p>
                  <p className="font-semibold">{selectedCustomer._count?.orders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Spent</p>
                  <p className="font-semibold">
                    {formatCurrency(selectedCustomer.orders?.reduce((s, o) => s + o.totalAmount, 0) || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <StatusBadge status={selectedCustomer.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <div>
                  <p className="text-gray-500">Joined</p>
                  <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// AdminCouponsPage
// ============================================================================

function AdminCouponsContent() {
  const [coupons, setCoupons] = useState<CouponDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formCode, setFormCode] = useState('')
  const [formType, setFormType] = useState('PERCENTAGE')
  const [formValue, setFormValue] = useState('')
  const [formMinPurchase, setFormMinPurchase] = useState('')
  const [formMaxDiscount, setFormMaxDiscount] = useState('')
  const [formUsageLimit, setFormUsageLimit] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=coupons')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCoupons(data)
    } catch (err) {
      console.error('Failed to fetch coupons:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  async function handleCreateCoupon() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-coupon',
          data: {
            code: formCode.toUpperCase(),
            type: formType,
            value: parseFloat(formValue) || 0,
            minPurchase: parseFloat(formMinPurchase) || 0,
            maxDiscount: formMaxDiscount ? parseFloat(formMaxDiscount) : null,
            usageLimit: formUsageLimit ? parseInt(formUsageLimit) : null,
            perUserLimit: 1,
            isActive: true,
            startsAt: new Date().toISOString(),
            expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Coupon created successfully' })
      setShowCreateDialog(false)
      resetCouponForm()
      fetchCoupons()
    } catch {
      toast({ title: 'Failed to create coupon', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCoupon(id: string) {
    try {
      const res = await fetch(`/api/admin?action=delete-coupon&id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Coupon deleted' })
      fetchCoupons()
    } catch {
      toast({ title: 'Failed to delete coupon', variant: 'destructive' })
    }
  }

  async function handleToggleCoupon(coupon: CouponDisplay) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-coupon',
          id: coupon.id,
          data: { isActive: !coupon.isActive },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: `Coupon ${coupon.isActive ? 'deactivated' : 'activated'}` })
      fetchCoupons()
    } catch {
      toast({ title: 'Failed to update coupon', variant: 'destructive' })
    }
  }

  function resetCouponForm() {
    setFormCode('')
    setFormType('PERCENTAGE')
    setFormValue('')
    setFormMinPurchase('')
    setFormMaxDiscount('')
    setFormUsageLimit('')
    setFormExpiresAt('')
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-700">
          {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
        </h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="hidden md:table-cell">Min Purchase</TableHead>
                  <TableHead className="hidden sm:table-cell">Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No coupons found
                    </TableCell>
                  </TableRow>
                ) : (
                  coupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-gray-100 px-2 py-1 text-sm font-mono font-semibold">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => {
                                              navigator.clipboard.writeText(coupon.code)
                                              toast({ title: 'Code copied!' })
                                            }}
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500">
                        {formatCurrency(coupon.minPurchase)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                        {coupon.usedCount}/{coupon.usageLimit || '∞'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={coupon.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleToggleCoupon(coupon)}>
                              {coupon.isActive ? (
                                <XCircle className="mr-2 h-4 w-4" />
                              ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                              )}
                              {coupon.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDeleteCoupon(coupon.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Coupon Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Coupon</DialogTitle>
            <DialogDescription>Create a new discount coupon for your store.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="coupon-code">Coupon Code</Label>
              <Input
                id="coupon-code"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER2024"
                className="uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coupon-type">Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger id="coupon-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coupon-value">Value</Label>
                <Input
                  id="coupon-value"
                  type="number"
                  step="0.01"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formType === 'PERCENTAGE' ? '10' : '5.00'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coupon-min">Min Purchase</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  step="0.01"
                  value={formMinPurchase}
                  onChange={(e) => setFormMinPurchase(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coupon-max">Max Discount</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  step="0.01"
                  value={formMaxDiscount}
                  onChange={(e) => setFormMaxDiscount(e.target.value)}
                  placeholder="No limit"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coupon-usage">Usage Limit</Label>
                <Input
                  id="coupon-usage"
                  type="number"
                  value={formUsageLimit}
                  onChange={(e) => setFormUsageLimit(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="coupon-expires">Expires At</Label>
                <Input
                  id="coupon-expires"
                  type="date"
                  value={formExpiresAt}
                  onChange={(e) => setFormExpiresAt(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCoupon} disabled={saving || !formCode || !formValue}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ============================================================================
// AdminReviewsPage
// ============================================================================

interface AdminReview {
  id: string
  rating: number
  title: string | null
  content: string | null
  isApproved: boolean | null
  createdAt: string
  user: { name: string | null; email: string }
  product: { name: string; images: string }
}

function AdminReviewsContent() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=reviews')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setReviews(data)
    } catch (err) {
      console.error('Failed to fetch reviews:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  async function handleApprove(id: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-review', id, data: { isApproved: true } }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Review approved' })
      fetchReviews()
    } catch {
      toast({ title: 'Failed to approve review', variant: 'destructive' })
    }
  }

  async function handleReject(id: string) {
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-review', id, data: { isApproved: false } }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Review rejected' })
      fetchReviews()
    } catch {
      toast({ title: 'Failed to reject review', variant: 'destructive' })
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin?action=delete-review&id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Review deleted' })
      fetchReviews()
    } catch {
      toast({ title: 'Failed to delete review', variant: 'destructive' })
    }
  }

  function getReviewStatus(review: AdminReview): 'Pending' | 'Approved' | 'Rejected' {
    if (review.isApproved === true) return 'Approved'
    if (review.isApproved === false) return 'Rejected'
    return 'Pending'
  }

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'ALL') return true
    const status = getReviewStatus(r)
    return status.toUpperCase() === filter
  })

  return (
    <>
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="hidden md:table-cell">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No reviews found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="text-sm max-w-[150px] truncate">
                        {review.product?.name || 'Unknown Product'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {review.user?.name || review.user?.email || 'Anonymous'}
                      </TableCell>
                      <TableCell><StarRating rating={review.rating} /></TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-500 max-w-[200px] truncate">
                        {review.title || '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={getReviewStatus(review)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getReviewStatus(review) !== 'Approved' && (
                              <DropdownMenuItem onClick={() => handleApprove(review.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {getReviewStatus(review) !== 'Rejected' && (
                              <DropdownMenuItem onClick={() => handleReject(review.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                Reject
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => handleDelete(review.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}

// ============================================================================
// AdminSettingsPage
// ============================================================================

interface StoreSettings {
  storeName?: string
  taxRate?: number
  freeShippingMin?: number
  currency?: string
  [key: string]: unknown
}

function AdminSettingsContent() {
  const [settings, setSettings] = useState<StoreSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin?action=settings')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setSettings(data)
      } catch (err) {
        console.error('Failed to fetch settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-settings',
          data: {
            storeName: settings.storeName,
            taxRate: settings.taxRate,
            freeShippingMin: settings.freeShippingMin,
            currency: settings.currency,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Settings saved successfully' })
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="max-w-2xl space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Store Settings</CardTitle>
            <CardDescription>Manage your store configuration and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={(settings.storeName as string) || ''}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, storeName: e.target.value }))
                }
                placeholder="ShopForge"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.taxRate ?? ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    taxRate: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="free-shipping">Free Shipping Minimum ($)</Label>
              <Input
                id="free-shipping"
                type="number"
                step="0.01"
                min="0"
                value={settings.freeShippingMin ?? ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    freeShippingMin: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">
                Orders above this amount qualify for free shipping
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={(settings.currency as string) || 'USD'}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
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
