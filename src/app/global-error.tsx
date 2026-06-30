/**
 * @file global-error.tsx
 * @description Global error boundary component for the ShopForge application.
 * Unlike `error.tsx` which only catches errors within its route segment, this
 * component catches errors that bubble up to the **root layout** level. This means
 * it handles catastrophic failures such as:
 * - Errors thrown inside the root layout itself (e.g. Providers crashing)
 * - Errors in the <html> or <body> rendering that bypass segment-level boundaries
 * - Errors that occur before the route segment tree is even established
 *
 * IMPORTANT: Because this component replaces the entire root layout on error,
 * it MUST define its own <html> and <body> tags. It also intentionally uses
 * inline styles instead of Tailwind classes, since the CSS stylesheet may have
 * failed to load or the Providers (which include theme context) may be unavailable.
 *
 * Key Responsibilities:
 * - Catches unrecoverable errors at the application root level
 * - Logs the error to the browser console for debugging
 * - Renders a minimal, self-contained error UI with inline styles
 * - Provides a "Try Again" button that re-invokes the failed render via `reset()`
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errorjs
 */

'use client'

import { useEffect } from 'react'

/**
 * GlobalError — the last-resort error boundary that catches root layout errors.
 *
 * This component is rendered in place of the entire application when a critical
 * error occurs at the root level. Because the root layout (including Providers,
 * fonts, and Tailwind) is unavailable, the UI is built with raw HTML and inline
 * styles to guarantee it renders regardless of what failed.
 *
 * @param props - The error boundary props provided by Next.js
 * @param props.error - The caught error object with an optional `digest` hash
 *   for cross-referencing with server logs
 * @param props.reset - A function that attempts to re-render the failed root
 *   layout. Useful when the error was transient (e.g. a failed initial data fetch).
 * @returns A minimal HTML document with the error UI
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  /**
   * Log the error to the console whenever it changes.
   * The `[error]` dependency ensures re-logging if the error is replaced
   * after a failed retry attempt produces a different error.
   */
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  // We must include <html> and <body> tags because this component replaces
  // the entire root layout. Without them, Next.js cannot render the page
  // since the document structure would be incomplete.
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {/* Minimal error UI using only inline styles.
            We avoid Tailwind/CSS classes here because:
            1. The CSS stylesheet may not have loaded
            2. The Providers (which set up theme context) may have crashed
            3. Using system fonts ensures text is always readable */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          /* Light gray background to visually distinguish the error state */
          backgroundColor: '#f9fafb',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Application Error
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
            A critical error occurred. Please refresh the page.
          </p>
          {/* "Try Again" button with inline styles.
              The reset() function attempts to re-render the root layout,
              which can resolve transient startup errors. */}
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              /* Dark background provides strong visual contrast for the CTA */
              backgroundColor: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
