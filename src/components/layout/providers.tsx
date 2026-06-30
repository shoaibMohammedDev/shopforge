/**
 * @file providers.tsx
 * @description Root context providers wrapper for the ShopForge e-commerce application.
 * Wraps the entire application tree with necessary context providers to enable
 * theme switching and server-state management across all pages and components.
 *
 * Key Features & Responsibilities:
 * - ThemeProvider (next-themes): enables light/dark/system theme switching via
 *   CSS class strategy, with system preference detection and instant transitions
 * - QueryClientProvider (@tanstack/react-query): provides a shared QueryClient
 *   instance for managing remote server state, caching, and background refetching
 * - QueryClient is created inside useState to survive across re-renders without
 *   being recreated on every component update
 *
 * @remarks
 * This component must be rendered high in the component tree (typically in the
 * root layout) so that all descendant components have access to theme and
 * query capabilities. It is marked as a client component because context
 * providers require client-side React rendering.
 */

'use client'

import { useState } from 'react'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Root context providers wrapper component.
 *
 * Initializes and provides the application-wide context providers required by
 * ShopForge: theme management via next-themes and server-state management via
 * TanStack React Query. Wraps children so all descendants can consume these contexts.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The child component tree to wrap with providers
 * @returns {JSX.Element} The provider-wrapped children
 *
 * @remarks
 * - QueryClient is instantiated inside `useState` with an initializer function
 *   to ensure it is created only once per component lifecycle, even during
 *   React strict-mode double-rendering in development
 * - `staleTime` is set to 60 seconds, meaning cached data is considered fresh
 *   for one minute before React Query will refetch in the background
 * - `refetchOnWindowFocus` is disabled to prevent unexpected data refreshes
 *   when the user switches browser tabs and returns
 *
 * @example
 * // Used in the root layout (app/layout.tsx):
 * <Providers>
 *   <Header />
 *   <main>{pageContent}</main>
 *   <Footer />
 * </Providers>
 */
export function Providers({ children }: { children: React.ReactNode }) {
  /**
   * Singleton QueryClient instance for TanStack React Query.
   * Created via useState's initializer function so it is preserved across
   * re-renders and not recreated on every render cycle.
   *
   * Configuration:
   * - staleTime: 60,000ms (1 minute) — data remains "fresh" for 60s
   * - refetchOnWindowFocus: false — prevents automatic refetch on tab focus
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,           // 1 minute before data is considered stale
            refetchOnWindowFocus: false,     // Disable auto-refetch when browser tab regains focus
          },
        },
      })
  )

  return (
    /**
     * ThemeProvider — wraps the app with next-themes context.
     *
     * Props:
     * - attribute="class": toggles dark mode by adding/removing the "dark" CSS class on <html>
     * - defaultTheme="system": respects the user's OS-level dark/light preference by default
     * - enableSystem: allows system preference to be used as a theme option
     * - disableTransitionOnChange: prevents CSS transition flicker when switching themes
     */
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {/**
       * QueryClientProvider — provides the React Query client to the component tree.
       * All descendant components can use `useQuery`, `useMutation`, etc.
       */}
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
