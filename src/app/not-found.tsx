/**
 * @file not-found.tsx
 * @description 404 Not Found page for the ShopForge application.
 * This is a Next.js convention-based page that is automatically rendered whenever
 * a user navigates to a route that does not exist. It provides a clean, centered
 * UI with a search icon, "404" heading, and a button to navigate back to the home page.
 *
 * Key Responsibilities:
 * - Displays a user-friendly 404 error page when no matching route is found
 * - Provides a "Back to Home" button to help users recover from broken links
 * - Uses a centered card layout consistent with the app's error-state design language
 * - Renders the search icon as a visual metaphor for "page not found"
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */

'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Search } from 'lucide-react'

/**
 * NotFound — the 404 page component rendered for unmatched routes.
 *
 * This component is invoked automatically by Next.js when `notFound()` is called
 * from a Server Component, or when the router cannot match the requested URL to
 * any defined route segment. It presents a centered card with:
 * - A muted search icon circle (visual indicator of a missing page)
 * - A bold "404" heading
 * - A descriptive "Page not found" subtitle
 * - A "Back to Home" button that performs a full navigation to `/`
 *
 * @returns A centered 404 error card with home navigation button
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Muted circle with search icon — a universal visual metaphor for
              "we looked but couldn't find what you're looking for" */}
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
          <p className="text-muted-foreground mt-2">Page not found</p>
        </CardHeader>
        <CardContent className="flex justify-center">
          {/**
           * "Back to Home" button — uses window.location.href for a full page
           * navigation rather than client-side routing. This ensures the
           * application state is fully reset, which is desirable when the user
           * has landed on an invalid route that may have left the router store
           * in an inconsistent state.
           */}
          <Button onClick={() => (window.location.href = '/')} className="gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
