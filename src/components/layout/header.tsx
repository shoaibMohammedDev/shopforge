'use client'

import { useState, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import {
  ShoppingBag,
  Search,
  Menu,
  ShoppingCart,
  User,
  LogOut,
  Package,
  Heart,
  Settings,
  MapPin,
  Moon,
  Sun,
  X,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouterStore } from '@/stores/router-store'
import { useCartStore } from '@/stores/cart-store'
import { useAuthStore } from '@/stores/auth-store'

const emptySubscribe = () => () => {}
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function Header() {
  const navigate = useRouterStore((s) => s.navigate)
  const currentRoute = useRouterStore((s) => s.currentRoute)
  const getItemCount = useCartStore((s) => s.getItemCount)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const { theme, setTheme } = useTheme()

  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mounted = useMounted()

  const itemCount = getItemCount()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate('products', { search: searchQuery.trim() })
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('home')
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const navLinks = [
    { label: 'Home', route: 'home' as const },
    { label: 'Products', route: 'products' as const },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>

        {/* Logo */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 font-bold text-xl hover:bg-transparent"
          onClick={() => navigate('home')}
        >
          <ShoppingBag className="size-6 text-primary" />
          <span className="hidden sm:inline">ShopForge</span>
        </Button>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navLinks.map((link) => (
            <Button
              key={link.route}
              variant={currentRoute === link.route ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate(link.route)}
              className="text-sm"
            >
              {link.label}
            </Button>
          ))}
        </nav>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-1 ml-auto md:ml-0">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
              className="hidden sm:flex"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
          )}

          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate('cart')}
            aria-label="Shopping cart"
          >
            <ShoppingCart className="size-5" />
            {itemCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {user.role === 'ADMIN' && (
                    <DropdownMenuItem onClick={() => navigate('admin')}>
                      <Shield className="mr-2 size-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => navigate('account')}>
                    <User className="mr-2 size-4" />
                    My Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('account-orders')}>
                    <Package className="mr-2 size-4" />
                    Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('account-wishlist')}>
                    <Heart className="mr-2 size-4" />
                    Wishlist
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('account-addresses')}>
                    <MapPin className="mr-2 size-4" />
                    Addresses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('account-settings')}>
                    <Settings className="mr-2 size-4" />
                    Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('login')}
              className="hidden sm:flex"
            >
              <User className="size-4 mr-1" />
              Login
            </Button>
          )}

          {/* Mobile Login (when not authenticated) */}
          {!isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => navigate('login')}
              aria-label="Login"
            >
              <User className="size-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Sheet Menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              ShopForge
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 py-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </form>

            {/* Mobile Nav Links */}
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Button
                  key={link.route}
                  variant={currentRoute === link.route ? 'secondary' : 'ghost'}
                  className="justify-start"
                  onClick={() => {
                    navigate(link.route)
                    setMobileMenuOpen(false)
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </nav>

            {/* Mobile Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="mr-2 size-4" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 size-4" />
                    Dark Mode
                  </>
                )}
              </Button>
            )}

            {/* Mobile Auth Links */}
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user.name || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                {user.role === 'ADMIN' && (
                  <Button
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      navigate('admin')
                      setMobileMenuOpen(false)
                    }}
                  >
                    <Shield className="mr-2 size-4" />
                    Admin Dashboard
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    navigate('account')
                    setMobileMenuOpen(false)
                  }}
                >
                  <User className="mr-2 size-4" />
                  My Account
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    navigate('account-orders')
                    setMobileMenuOpen(false)
                  }}
                >
                  <Package className="mr-2 size-4" />
                  Orders
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    navigate('account-wishlist')
                    setMobileMenuOpen(false)
                  }}
                >
                  <Heart className="mr-2 size-4" />
                  Wishlist
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    navigate('account-addresses')
                    setMobileMenuOpen(false)
                  }}
                >
                  <MapPin className="mr-2 size-4" />
                  Addresses
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start"
                  onClick={() => {
                    navigate('account-settings')
                    setMobileMenuOpen(false)
                  }}
                >
                  <Settings className="mr-2 size-4" />
                  Settings
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-destructive hover:text-destructive"
                  onClick={() => {
                    handleLogout()
                    setMobileMenuOpen(false)
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  Log out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    navigate('login')
                    setMobileMenuOpen(false)
                  }}
                >
                  <User className="mr-2 size-4" />
                  Login
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigate('register')
                    setMobileMenuOpen(false)
                  }}
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
