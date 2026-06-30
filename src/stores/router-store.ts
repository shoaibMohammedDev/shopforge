import { create } from 'zustand'
import type { RoutePath } from '@/types'

// Map routes to URL paths for browser history sync
const ROUTE_TO_PATH: Record<RoutePath, string> = {
  home: '/',
  products: '/products',
  'product-detail': '/products/:id',
  cart: '/cart',
  checkout: '/checkout',
  login: '/login',
  register: '/register',
  account: '/account',
  'account-orders': '/account/orders',
  'account-order-detail': '/account/orders/:id',
  'account-wishlist': '/account/wishlist',
  'account-addresses': '/account/addresses',
  'account-settings': '/account/settings',
  admin: '/admin',
  'admin-analytics': '/admin/analytics',
  'admin-products': '/admin/products',
  'admin-orders': '/admin/orders',
  'admin-customers': '/admin/customers',
  'admin-coupons': '/admin/coupons',
  'admin-reviews': '/admin/reviews',
  'admin-settings': '/admin/settings',
  'admin-banners': '/admin/banners',
}

// Map URL patterns to routes (use new RegExp to avoid SWC parsing issues with / in patterns)
const PATH_TO_ROUTE: Array<{ pattern: RegExp; route: RoutePath; paramKeys: string[] }> = [
  { pattern: new RegExp('^\\/products\\/([^/]+)$'), route: 'product-detail', paramKeys: ['id'] },
  { pattern: new RegExp('^\\/account\\/orders\\/([^/]+)$'), route: 'account-order-detail', paramKeys: ['orderId'] },
  { pattern: new RegExp('^\\/products$'), route: 'products', paramKeys: [] },
  { pattern: new RegExp('^\\/cart$'), route: 'cart', paramKeys: [] },
  { pattern: new RegExp('^\\/checkout$'), route: 'checkout', paramKeys: [] },
  { pattern: new RegExp('^\\/login$'), route: 'login', paramKeys: [] },
  { pattern: new RegExp('^\\/register$'), route: 'register', paramKeys: [] },
  { pattern: new RegExp('^\\/account\\/orders$'), route: 'account-orders', paramKeys: [] },
  { pattern: new RegExp('^\\/account\\/wishlist$'), route: 'account-wishlist', paramKeys: [] },
  { pattern: new RegExp('^\\/account\\/addresses$'), route: 'account-addresses', paramKeys: [] },
  { pattern: new RegExp('^\\/account\\/settings$'), route: 'account-settings', paramKeys: [] },
  { pattern: new RegExp('^\\/account$'), route: 'account', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/analytics$'), route: 'admin-analytics', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/products$'), route: 'admin-products', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/orders$'), route: 'admin-orders', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/customers$'), route: 'admin-customers', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/coupons$'), route: 'admin-coupons', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/reviews$'), route: 'admin-reviews', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/settings$'), route: 'admin-settings', paramKeys: [] },
  { pattern: new RegExp('^\\/admin\\/banners$'), route: 'admin-banners', paramKeys: [] },
  { pattern: new RegExp('^\\/admin$'), route: 'admin', paramKeys: [] },
]

function buildUrl(route: RoutePath, params: Record<string, string>): string {
  let path = ROUTE_TO_PATH[route] || '/'
  // Replace :param with actual values
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value)
  })
  // Remove any remaining :param placeholders
  path = path.replace(/\/:[^/]+/g, '')
  // Add query params for non-path params
  const queryParams: Record<string, string> = {}
  const pathTemplate = ROUTE_TO_PATH[route] || '/'
  Object.entries(params).forEach(([key, value]) => {
    if (!pathTemplate.includes(`:${key}`) && key !== 'search') {
      queryParams[key] = value
    }
  })
  const qs = new URLSearchParams(queryParams).toString()
  return qs ? `${path}?${qs}` : path
}

function parseUrl(pathname: string, search: string): { route: RoutePath; params: Record<string, string> } {
  // Try pattern matching
  for (const { pattern, route, paramKeys } of PATH_TO_ROUTE) {
    const match = pathname.match(pattern)
    if (match) {
      const params: Record<string, string> = {}
      paramKeys.forEach((key, i) => {
        params[key] = match[i + 1]
      })
      // Parse query params
      if (search) {
        const sp = new URLSearchParams(search)
        sp.forEach((value, key) => {
          if (!params[key]) params[key] = value
        })
      }
      return { route, params }
    }
  }
  return { route: 'home', params: {} }
}

interface RouterStore {
  currentRoute: RoutePath
  params: Record<string, string>
  history: Array<{ route: RoutePath; params: Record<string, string> }>
  navigate: (route: RoutePath, params?: Record<string, string>) => void
  goBack: () => void
}

export const useRouterStore = create<RouterStore>((set, get) => ({
  currentRoute: 'home',
  params: {},
  history: [{ route: 'home', params: {} }],

  navigate: (route, params = {}) => {
    const state = get()
    const url = buildUrl(route, params)
    // Update browser URL without reload
    window.history.pushState({ route, params }, '', url)
    set({
      currentRoute: route,
      params,
      history: [...state.history, { route, params }],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },

  goBack: () => {
    const state = get()
    if (state.history.length > 1) {
      const newHistory = state.history.slice(0, -1)
      const lastEntry = newHistory[newHistory.length - 1]
      set({
        currentRoute: lastEntry.route,
        params: lastEntry.params,
        history: newHistory,
      })
      window.history.back()
    }
  },
}))

// Listen for browser back/forward buttons
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    if (event.state?.route) {
      useRouterStore.setState({
        currentRoute: event.state.route,
        params: event.state.params || {},
      })
    } else {
      // Fallback: parse current URL
      const { route, params } = parseUrl(window.location.pathname, window.location.search)
      useRouterStore.setState({ currentRoute: route, params })
    }
  })

  // Initialize from current URL on page load
  const { route, params } = parseUrl(window.location.pathname, window.location.search)
  if (route !== 'home' || Object.keys(params).length > 0) {
    useRouterStore.setState({ currentRoute: route, params })
  }

  // Expose store on window for debugging
  ;(window as unknown as Record<string, unknown>).__routerStore = useRouterStore
}
