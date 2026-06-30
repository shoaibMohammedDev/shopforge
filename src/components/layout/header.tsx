/**
 * @file header.tsx
 * @description Site-wide header component for the ShopForge e-commerce application.
 * Provides core navigation, product search, shopping cart access, user authentication
 * controls, and theme toggling. Renders a responsive layout with a mobile sheet menu
 * that collapses the navigation on smaller screens.
 *
 * Key Features & Responsibilities:
 * - Sticky header with backdrop blur for visual hierarchy
 * - Desktop & mobile navigation with active-route highlighting
 * - Product search bar with form submission and clear functionality
 * - Shopping cart button with item count badge (caps at "99+")
 * - User authentication dropdown (desktop) and mobile auth menu
 * - Admin-only navigation link gated by user role
 * - Light/dark theme toggle (hydrated safely via useMounted)
 * - Mobile sheet menu with full navigation, search, auth, and theme controls
 */

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

/**
 * No-op subscribe function used as a stub for useSyncExternalStore.
 * Required because useSyncExternalStore expects a subscribe callback,
 * but we only need the snapshot values for hydration detection.
 */
const emptySubscribe = () => () => {}

/**
 * Custom hook that detects whether the component has mounted on the client.
 * Uses useSyncExternalStore to safely handle SSR/client hydration mismatches.
 *
 * @returns {boolean} `true` on the client after mounting, `false` during SSR
 *
 * @example
 * const mounted = useMounted()
 * // Only render client-only UI (e.g. theme toggle) when mounted is true
 */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,   // Client snapshot: component has mounted
    () => false   // SSR snapshot: component has not mounted yet
  )
}

/**
 * Main site header component for ShopForge.
 *
 * Renders a sticky top bar with logo, navigation links, search bar, cart button
 * with item count, user authentication controls, and a theme toggle. On mobile
 * viewports, navigation collapses into a slide-out sheet menu accessible via a
 * hamburger button.
 *
 * @component
 * @returns {JSX.Element} The rendered header element
 *
 * @remarks
 * - Reads navigation state from `useRouterStore` to highlight the active route
 * - Reads cart item count from `useCartStore` to display the badge
 * - Reads auth state from `useAuthStore` to toggle between login button and user dropdown
 * - Reads theme from `next-themes` useTheme hook for the dark/light mode toggle
 *
 * @example
 * // Used in root layout:
 * <Header />
 */
export function Header() {
  /* ---- Store subscriptions ---- */

  /** Navigate between app routes (client-side routing) */
  const navigate = useRouterStore((s) => s.navigate)

  /** Current active route identifier, used to highlight the active nav link */
  const currentRoute = useRouterStore((s) => s.currentRoute)

  /** Selector that computes the total number of items in the cart */
  const getItemCount = useCartStore((s) => s.getItemCount)

  /** Currently authenticated user object, or null if logged out */
  const user = useAuthStore((s) => s.user)

  /** Whether the user is currently authenticated */
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  /** Logout action that clears auth state from the store */
  const logout = useAuthStore((s) => s.logout)

  /** Current theme ("light" | "dark" | "system") and setter from next-themes */
  const { theme, setTheme } = useTheme()

  /* ---- Local component state ---- */

  /** Current value of the search input field */
  const [searchQuery, setSearchQuery] = useState('')

  /** Whether the mobile sheet menu is open */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  /** Client mount flag — prevents hydration mismatch for theme-dependent UI */
  const mounted = useMounted()

  /** Computed total quantity of items currently in the shopping cart */
  const itemCount = getItemCount()

  /**
   * Handles search form submission.
   * Navigates to the products page with the search query as a parameter,
   * then resets the search input and closes the mobile menu if open.
   *
   * @param {React.FormEvent} e - The form submission event
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate('products', { search: searchQuery.trim() })
      setSearchQuery('')
      setMobileMenuOpen(false)
    }
  }

  /**
   * Handles user logout.
   * Clears authentication state from the store and redirects to the home page.
   */
  const handleLogout = () => {
    logout()
    navigate('home')
  }

  /**
   * Derives a two-letter initials string from a user's display name.
   * Used as the fallback content inside the Avatar component.
   *
   * @param {string | null} name - The user's full name, or null
   * @returns {string} Up to two uppercase initials, defaults to "U" if name is null
   */
  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  /**
   * Primary navigation links displayed in the desktop nav bar and mobile sheet.
   * Each entry maps a display label to a named route in the router store.
   */
  const navLinks = [
    { label: 'Home', route: 'home' as const },
    { label: 'Products', route: 'products' as const },
  ]

  return (
    /* Sticky header with backdrop blur effect for content scroll-under */
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center gap-4 px-4">

        {/* Mobile Menu Button — visible only on screens below md breakpoint */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>

        {/* Logo / Brand — navigates to home on click */}
        <Button
          variant="ghost"
          className="flex items-center gap-2 px-2 font-bold text-xl hover:bg-transparent"
          onClick={() => navigate('home')}
        >
          <ShoppingBag className="size-6 text-primary" />
          {/* Brand text hidden on very small screens to save space */}
          <span className="hidden sm:inline">ShopForge</span>
        </Button>

        {/* Desktop Navigation Links — hidden on mobile, uses active route highlighting */}
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

        {/* Search Bar — desktop only, submits via handleSearch */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            {/* Search icon positioned inside the input on the left */}
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {/* Clear button — only visible when there is text in the search field */}
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

        {/* Right Actions — theme toggle, cart, and user menu */}
        <div className="flex items-center gap-1 ml-auto md:ml-0">

          {/* Theme Toggle — toggles between light and dark, hidden on small screens */}
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

          {/* Cart Button — navigates to cart page; badge shows item count */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => navigate('cart')}
            aria-label="Shopping cart"
          >
            <ShoppingCart className="size-5" />
            {/* Item count badge — displays "99+" if count exceeds 99 */}
            {itemCount > 0 && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center"
              >
                {itemCount > 99 ? '99+' : itemCount}
              </Badge>
            )}
          </Button>

          {/* User Menu — dropdown for authenticated users, login button for guests */}
          {isAuthenticated && user ? (
            /* Authenticated: avatar dropdown with account links and logout */
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
                {/* User info header showing name and email */}
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
                  {/* Admin Dashboard link — only visible for users with ADMIN role */}
                  {user.role === 'ADMIN' && (
                    <DropdownMenuItem onClick={() => navigate('admin')}>
                      <Shield className="mr-2 size-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  {/* Standard account navigation links */}
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
                {/* Destructive logout action — clears session and returns home */}
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Guest: login button visible on desktop (sm and up) */
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

          {/* Mobile Login (when not authenticated) — icon-only button for small screens */}
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

      {/* Mobile Sheet Menu — slide-out drawer from the left for navigation on small screens */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[300px] sm:w-[350px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingBag className="size-5 text-primary" />
              ShopForge
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 py-4">
            {/* Mobile Search — same behavior as desktop, submits via handleSearch */}
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

            {/* Mobile Nav Links — closes the sheet on navigation */}
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

            {/* Mobile Theme Toggle — shows descriptive label alongside icon */}
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

            {/* Mobile Auth Section — shows user info and links when logged in, login/register when logged out */}
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-1">
                {/* User info block with avatar, name, and email */}
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
                {/* Admin link — only rendered for ADMIN role users */}
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
                {/* Account navigation — each link closes the mobile menu on click */}
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
                {/* Logout button — styled with destructive color to indicate sign-out action */}
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
              /* Guest: login and register buttons for unauthenticated mobile users */
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
