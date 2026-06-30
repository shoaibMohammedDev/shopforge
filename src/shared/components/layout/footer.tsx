/**
 * @file footer.tsx
 * @description Site-wide footer component for the ShopForge e-commerce application.
 * Displays organized navigation links across multiple columns, a newsletter subscription
 * form, social media links, and copyright information.
 *
 * Key Features & Responsibilities:
 * - Four-column responsive grid layout: Shop, Customer Service, About, Newsletter
 * - Navigation links driven by router store for client-side routing
 * - Newsletter email subscription form with temporary success feedback
 * - Social media icon buttons (Facebook, Twitter, Instagram, YouTube)
 * - Dynamic copyright year rendering
 * - Responsive design: stacks columns on mobile, grid on larger screens
 */

'use client'

import { useState } from 'react'
import { ShoppingBag, Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react'
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Separator } from "@/shared/components/ui/separator"
import { useRouterStore } from "@/shared/stores/router-store"

/**
 * Site-wide footer component for ShopForge.
 *
 * Renders a multi-column footer with shop navigation, customer service links,
 * company information, and a newsletter subscription form. Includes a bottom bar
 * with copyright text and social media links.
 *
 * @component
 * @returns {JSX.Element} The rendered footer element
 *
 * @remarks
 * - Uses `useRouterStore` for client-side navigation via the `navigate` function
 * - Newsletter subscription is a local-only demo (no backend call); success
 *   message auto-dismisses after 3 seconds
 * - Link data is defined as static arrays for easy maintenance and extension
 *
 * @example
 * // Used in root layout:
 * <Footer />
 */
export function Footer() {
  /** Client-side navigation function from the router store */
  const navigate = useRouterStore((s) => s.navigate)

  /** Current value of the newsletter email input */
  const [email, setEmail] = useState('')

  /** Whether the user has just submitted the newsletter form (triggers success message) */
  const [subscribed, setSubscribed] = useState(false)

  /**
   * Handles newsletter form submission.
   * Sets the subscribed flag to show a success message, clears the email input,
   * and auto-resets the subscribed state after 3 seconds to allow re-subscription.
   *
   * @param {React.FormEvent} e - The form submission event
   */
  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail('')
      /* Auto-dismiss the success message after 3 seconds */
      setTimeout(() => setSubscribed(false), 3000)
    }
  }

  /**
   * Shop-related navigation links for the first footer column.
   * Each entry includes a route and optional params (e.g., sort order or filters)
   * that are passed to the router store's navigate function.
   */
  const shopLinks = [
    { label: 'All Products', route: 'products' as const, params: {} as Record<string, string> },
    { label: 'New Arrivals', route: 'products' as const, params: { sort: 'newest' } },
    { label: 'Best Sellers', route: 'products' as const, params: { sort: 'popular' } },
    { label: 'Featured', route: 'products' as const, params: { isFeatured: 'true' } },
    { label: 'Cart', route: 'cart' as const, params: {} as Record<string, string> },
  ]

  /**
   * Customer service navigation links for the second footer column.
   * Links to account-related pages and informational pages.
   */
  const customerServiceLinks = [
    { label: 'My Account', route: 'account' as const, params: {} as Record<string, string> },
    { label: 'Order Tracking', route: 'account-orders' as const, params: {} as Record<string, string> },
    { label: 'Wishlist', route: 'account-wishlist' as const, params: {} as Record<string, string> },
    { label: 'Shipping Info', route: 'products' as const, params: {} as Record<string, string> },
    { label: 'Returns & Exchanges', route: 'products' as const, params: {} as Record<string, string> },
  ]

  /**
   * Company / about-page navigation links for the third footer column.
   * Currently routes to the home page as a placeholder until dedicated pages are built.
   */
  const aboutLinks = [
    { label: 'About Us', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Contact Us', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Careers', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Privacy Policy', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Terms of Service', route: 'home' as const, params: {} as Record<string, string> },
  ]

  return (
    /* Footer with subtle background tint and top border for visual separation */
    <footer className="bg-muted/40 border-t">
      <div className="container mx-auto px-4 py-12">

        {/* Four-column responsive grid: 1 col on mobile → 2 on sm → 4 on lg */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">

          {/* Shop Column — product browsing and cart links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Shop</h3>
            <ul className="space-y-2">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.route, link.params)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer Service Column — account and support links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Customer Service</h3>
            <ul className="space-y-2">
              {customerServiceLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.route)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* About Column — company info and legal links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">About</h3>
            <ul className="space-y-2">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => navigate(link.route)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column — email subscription form with success feedback */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Newsletter</h3>
            <p className="text-sm text-muted-foreground">
              Subscribe to get special offers, free giveaways, and new arrivals.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="flex-1 h-9"
                />
                <Button type="submit" size="sm" className="shrink-0">
                  <Mail className="size-4 mr-1" />
                  Subscribe
                </Button>
              </div>
              {/* Success message — visible for 3 seconds after form submission */}
              {subscribed && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Thank you for subscribing!
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Horizontal divider separating link columns from the bottom bar */}
        <Separator className="my-8" />

        {/* Bottom Bar — copyright on the left, social icons on the right */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          {/* Copyright text with dynamic year and brand logo */}
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ShopForge. All rights reserved.
            </span>
          </div>

          {/* Social media link buttons — icon-only with accessible aria-labels */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="size-8" aria-label="Facebook">
              <Facebook className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Twitter">
              <Twitter className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Instagram">
              <Instagram className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8" aria-label="YouTube">
              <Youtube className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </footer>
  )
}
