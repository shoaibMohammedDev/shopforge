/**
 * @file use-mobile.ts
 * @description Custom React hook for detecting whether the viewport is at mobile width.
 *
 * Key Responsibilities:
 * - Determines if the current viewport width falls below the mobile breakpoint
 * - Listens for viewport resize events and updates reactively
 * - Returns a boolean value that can drive responsive UI logic
 *   (e.g., rendering mobile vs. desktop layouts, hiding/showing elements)
 *
 * Implementation Details:
 * - Uses `window.matchMedia` with a `max-width` media query for efficient
 *   resize detection (better performance than listening to `resize` events)
 * - Initializes state as `undefined` during SSR/hydration to avoid
 *   mismatches, then resolves to `true`/`false` on the client
 * - The `!!isMobile` return coerces `undefined` to `false`, providing a
 *   safe default (desktop layout) during the initial render
 */

import * as React from "react"

/**
 * The viewport width threshold (in pixels) that separates mobile from desktop.
 *
 * Set to 768px, which aligns with Tailwind CSS's `md:` breakpoint.
 * Viewports narrower than 768px are considered mobile.
 */
const MOBILE_BREAKPOINT = 768

/**
 * React hook that returns `true` when the viewport is at mobile width.
 *
 * Uses `window.matchMedia` to listen for changes in the viewport width
 * relative to the mobile breakpoint. The hook sets up an event listener
 * on mount and cleans it up on unmount to prevent memory leaks.
 *
 * **SSR Safety**: The initial state is `undefined` before the effect runs,
 * which prevents hydration mismatches. The `!!isMobile` coercion ensures
 * the hook returns `false` (desktop) during SSR and the initial render,
 * then updates to the correct value after hydration.
 *
 * @returns `true` if viewport width < 768px (mobile), `false` otherwise
 *
 * @example
 * function Navigation() {
 *   const isMobile = useIsMobile()
 *
 *   return isMobile ? <MobileNav /> : <DesktopNav />
 * }
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Create a media query list that matches viewports below the breakpoint
    // Using (max-width: 767px) instead of (max-width: 768px) because we want
    // strictly less than 768px to be considered mobile
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    /** Handler called when the media query match status changes */
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Subscribe to media query change events (e.g., rotation, resize)
    mql.addEventListener("change", onChange)

    // Set the initial value immediately on mount
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)

    // Cleanup: remove the listener when the component unmounts
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Coerce undefined → false for safe consumption during SSR/initial render
  return !!isMobile
}
