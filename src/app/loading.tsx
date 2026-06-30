/**
 * @file loading.tsx
 * @description Loading skeleton component for the ShopForge application.
 * This is a Next.js convention-based loading UI that is automatically displayed
 * while Server Components in the `/` route segment are being resolved. It provides
 * a visual placeholder that mimics the layout of the home page, reducing perceived
 * load time and preventing layout shift (CLS) when content appears.
 *
 * Key Responsibilities:
 * - Renders a full-page skeleton that mirrors the home page layout structure
 * - Shows placeholder shapes for the header, hero banner, category grid, product grid, and footer
 * - Uses shadcn/ui `<Skeleton>` components for consistent pulse animations
 * - Maintains the same grid structure (2-col mobile, 4-col desktop) as the real page
 *   so the layout doesn't shift when content loads
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/loading
 */

import { Skeleton } from "@/shared/components/ui/skeleton"

/**
 * Loading — the suspense fallback component shown while the page is loading.
 *
 * The skeleton is structured to match the home page layout as closely as possible:
 * 1. **Header** — logo placeholder, search bar (desktop-only), and icon placeholders
 * 2. **Hero** — full-width banner placeholder at 400px height
 * 3. **Category Grid** — 8 skeleton cards in a 2×4 / 4×2 responsive grid
 * 4. **Product Grid** — 4 product card skeletons, each with image + 3 text lines
 * 5. **Footer** — minimal placeholder at the bottom
 *
 * Using matching grid layouts ensures zero cumulative layout shift (CLS) when
 * the real content replaces the skeletons.
 *
 * @returns A full-page skeleton UI that mirrors the home page structure
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header skeleton — matches the sticky header in the real layout */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo placeholder */}
          <Skeleton className="h-8 w-32" />
          {/* Search bar placeholder — hidden on mobile to match responsive behavior */}
          <Skeleton className="h-10 w-64 hidden md:block" />
          {/* Action icon placeholders (e.g. cart, user) */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      {/* Content skeleton — main body area */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero banner skeleton — 400px height matches the actual hero section */}
        <Skeleton className="h-[400px] w-full rounded-xl mb-8" />

        {/* Category grid skeleton — 8 items to match the typical category count */}
        <div className="mb-12">
          {/* Section heading placeholder */}
          <Skeleton className="h-8 w-48 mb-6" />
          {/* Responsive grid: 2 columns on mobile, 4 on desktop */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/** Render 8 category card skeletons to match the real category grid */}
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Products grid skeleton — 4 product card placeholders */}
        <div>
          {/* Section heading placeholder */}
          <Skeleton className="h-8 w-48 mb-6" />
          {/* Responsive grid matching the product listing layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/**
             * Each product card skeleton includes:
             * - Image area (h-48) — the product thumbnail
             * - Title line (w-3/4) — product name placeholder
             * - Subtitle line (w-1/2) — description or category
             * - Price line (w-1/3, h-6) — slightly taller to stand out as the price
             */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer skeleton — minimal placeholder to maintain layout structure */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-4 w-48" />
        </div>
      </footer>
    </div>
  )
}
