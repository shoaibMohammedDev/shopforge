/**
 * @file router-store.ts
 * @description Zustand store for client-side routing with browser history synchronization.
 *
 * Key Responsibilities:
 * - Manages the current route and route parameters in a client-side SPA context
 * - Synchronizes route state with the browser's History API (pushState/popstate)
 * - Provides URL building and parsing utilities for bidirectional route↔URL mapping
 * - Maintains a navigation history stack for back-navigation support
 * - Initializes route state from the browser's current URL on page load
 */

import { create } from 'zustand'
import type { RoutePath } from "@/shared/types"

/**
 * Mapping of internal route identifiers to URL path patterns.
 *
 * Used by `buildUrl()` to construct browser-accessible URLs from route names.
 * Dynamic segments are expressed as `:paramName` (e.g., `/products/:id`).
 *
 * @example
 * ROUTE_TO_PATH['product-detail'] // => '/products/:id'
 */
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

/**
 * Reverse mapping from URL patterns to route identifiers.
 *
 * Each entry contains:
 * - `pattern` — A RegExp that matches a URL pathname (constructed via `new RegExp`
 *   to avoid SWC parsing issues with forward slashes in regex literals)
 * - `route` — The corresponding internal `RoutePath` identifier
 * - `paramKeys` — Ordered list of dynamic segment names captured by the regex
 *
 * **Ordering matters**: more specific patterns (with dynamic segments) MUST come
 * before less specific ones so that `/products/123` matches `product-detail`
 * instead of `products`.
 *
 * @example
 * // Matches /products/abc123 and captures 'abc123' as the 'id' param
 * { pattern: /^\/products\/([^/]+)$/, route: 'product-detail', paramKeys: ['id'] }
 */
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

/**
 * Constructs a browser-accessible URL string from a route identifier and parameters.
 *
 * The function handles three categories of parameters:
 * 1. **Path params** (e.g., `:id`) — Replaced inline in the URL path
 * 2. **Remaining placeholders** — Stripped from the URL to keep it clean
 * 3. **Non-path params** — Appended as query string parameters
 *
 * The `search` key is intentionally excluded from query params because it is
 * handled separately by the URL's native search property.
 *
 * @param route - The internal route identifier to build a URL for
 * @param params - Key-value pairs of route parameters (path params + query params)
 * @returns A fully constructed URL string, optionally including a query string
 *
 * @example
 * buildUrl('product-detail', { id: 'abc123' })
 * // => '/products/abc123'
 *
 * buildUrl('products', { categoryId: 'cat1', page: '2' })
 * // => '/products?categoryId=cat1&page=2'
 */
function buildUrl(route: RoutePath, params: Record<string, string>): string {
  let path = ROUTE_TO_PATH[route] || '/'

  // Step 1: Replace dynamic :param placeholders with actual values
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value)
  })

  // Step 2: Remove any remaining :param placeholders that weren't provided
  // (prevents unresolved `:param` segments from appearing in the URL)
  path = path.replace(/\/:[^/]+/g, '')

  // Step 3: Build query string from params that are NOT path segments
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

/**
 * Parses a browser URL (pathname + search) into a route identifier and parameters.
 *
 * Iterates through `PATH_TO_ROUTE` patterns in order (most specific first)
 * and returns the first match. If no pattern matches, falls back to the `home` route.
 *
 * Query parameters from the search string are merged into the params object,
 * but do not overwrite path-derived params (path params take precedence).
 *
 * @param pathname - The URL pathname (e.g., `/products/abc123`)
 * @param search - The URL search string (e.g., `?page=2`)
 * @returns An object containing the matched `route` and extracted `params`
 *
 * @example
 * parseUrl('/products/abc123', '')
 * // => { route: 'product-detail', params: { id: 'abc123' } }
 *
 * parseUrl('/products', '?categoryId=cat1')
 * // => { route: 'products', params: { categoryId: 'cat1' } }
 */
function parseUrl(pathname: string, search: string): { route: RoutePath; params: Record<string, string> } {
  // Try each pattern in order (most specific patterns are listed first)
  for (const { pattern, route, paramKeys } of PATH_TO_ROUTE) {
    const match = pathname.match(pattern)
    if (match) {
      // Extract captured groups into named params based on paramKeys order
      const params: Record<string, string> = {}
      paramKeys.forEach((key, i) => {
        params[key] = match[i + 1]
      })

      // Merge query params from the search string, but don't overwrite path-derived params
      if (search) {
        const sp = new URLSearchParams(search)
        sp.forEach((value, key) => {
          if (!params[key]) params[key] = value
        })
      }
      return { route, params }
    }
  }

  // Fallback to home route if no pattern matches
  return { route: 'home', params: {} }
}

/**
 * Shape of the router Zustand store.
 *
 * Maintains the current route, its parameters, a history stack for
 * back-navigation, and action methods for navigating and going back.
 */
interface RouterStore {
  /** The currently active route identifier */
  currentRoute: RoutePath
  /** Parameters for the current route (path params + query params) */
  params: Record<string, string>
  /** Ordered navigation history stack; the last entry is the current route */
  history: Array<{ route: RoutePath; params: Record<string, string> }>
  /**
   * Navigate to a new route, updating browser history and scrolling to top.
   * @param route - The target route identifier
   * @param params - Optional route parameters (path and/or query params)
   */
  navigate: (route: RoutePath, params?: Record<string, string>) => void
  /**
   * Navigate back to the previous route in the history stack.
   * Also triggers `window.history.back()` to keep browser history in sync.
   */
  goBack: () => void
}

/**
 * Zustand store for client-side routing with full browser history synchronization.
 *
 * On navigation, the store:
 * 1. Builds the corresponding URL via `buildUrl()`
 * 2. Pushes a new entry to `window.history` (no page reload)
 * 3. Updates internal state (currentRoute, params, history)
 * 4. Scrolls the viewport to the top smoothly
 *
 * On `goBack()`, the store:
 * 1. Pops the last entry from the internal history stack
 * 2. Restores the previous route and params
 * 3. Calls `window.history.back()` to sync the browser's address bar
 */
export const useRouterStore = create<RouterStore>((set, get) => ({
  currentRoute: 'home',
  params: {},
  history: [{ route: 'home', params: {} }],

  navigate: (route, params = {}) => {
    const state = get()
    const url = buildUrl(route, params)

    // Push to browser history without causing a page reload
    window.history.pushState({ route, params }, '', url)

    set({
      currentRoute: route,
      params,
      // Append the new entry to the history stack (immutable update)
      history: [...state.history, { route, params }],
    })

    // Scroll to top for a clean page transition feel
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },

  goBack: () => {
    const state = get()
    // Only navigate back if there's a previous entry in the stack
    if (state.history.length > 1) {
      // Remove the current entry and restore the previous one
      const newHistory = state.history.slice(0, -1)
      const lastEntry = newHistory[newHistory.length - 1]
      set({
        currentRoute: lastEntry.route,
        params: lastEntry.params,
        history: newHistory,
      })
      // Sync browser history — this will trigger a popstate event,
      // but since we've already updated state, we rely on the history stack
      window.history.back()
    }
  },
}))

// ---------------------------------------------------------------------------
// Browser history event listeners (client-side only)
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  /**
   * Listen for browser back/forward button clicks (popstate events).
   *
   * When the user navigates via browser chrome (back/forward buttons),
   * we need to sync the Zustand store with the new URL. Two strategies:
   *
   * 1. **Preferred**: Read the route from `event.state` (set by `pushState`)
   * 2. **Fallback**: Parse the current URL via `parseUrl()` if state is missing
   *    (e.g., on the initial page load or when state was not pushed by us)
   */
  window.addEventListener('popstate', (event) => {
    if (event.state?.route) {
      // Route info is available from the history entry we pushed
      useRouterStore.setState({
        currentRoute: event.state.route,
        params: event.state.params || {},
      })
    } else {
      // Fallback: parse the current URL to determine the route
      const { route, params } = parseUrl(window.location.pathname, window.location.search)
      useRouterStore.setState({ currentRoute: route, params })
    }
  })

  /**
   * Initialize route state from the browser's current URL on page load.
   *
   * This ensures that if a user directly navigates to a deep link
   * (e.g., `/products/abc123`), the store is initialized to the correct
   * route instead of always defaulting to `home`.
   */
  const { route, params } = parseUrl(window.location.pathname, window.location.search)
  if (route !== 'home' || Object.keys(params).length > 0) {
    useRouterStore.setState({ currentRoute: route, params })
  }

  /**
   * Expose the router store on the `window` object for debugging.
   *
   * In development, this allows inspecting the router state via the
   * browser console: `window.__routerStore.getState()`
   */
  ;(window as unknown as Record<string, unknown>).__routerStore = useRouterStore
}
