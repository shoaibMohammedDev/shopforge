'use client'

import { useState } from 'react'
import { ShoppingBag, Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useRouterStore } from '@/stores/router-store'

export function Footer() {
  const navigate = useRouterStore((s) => s.navigate)
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 3000)
    }
  }

  const shopLinks = [
    { label: 'All Products', route: 'products' as const, params: {} as Record<string, string> },
    { label: 'New Arrivals', route: 'products' as const, params: { sort: 'newest' } },
    { label: 'Best Sellers', route: 'products' as const, params: { sort: 'popular' } },
    { label: 'Featured', route: 'products' as const, params: { isFeatured: 'true' } },
    { label: 'Cart', route: 'cart' as const, params: {} as Record<string, string> },
  ]

  const customerServiceLinks = [
    { label: 'My Account', route: 'account' as const, params: {} as Record<string, string> },
    { label: 'Order Tracking', route: 'account-orders' as const, params: {} as Record<string, string> },
    { label: 'Wishlist', route: 'account-wishlist' as const, params: {} as Record<string, string> },
    { label: 'Shipping Info', route: 'products' as const, params: {} as Record<string, string> },
    { label: 'Returns & Exchanges', route: 'products' as const, params: {} as Record<string, string> },
  ]

  const aboutLinks = [
    { label: 'About Us', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Contact Us', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Careers', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Privacy Policy', route: 'home' as const, params: {} as Record<string, string> },
    { label: 'Terms of Service', route: 'home' as const, params: {} as Record<string, string> },
  ]

  return (
    <footer className="bg-muted/40 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Shop Column */}
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

          {/* Customer Service Column */}
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

          {/* About Column */}
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

          {/* Newsletter Column */}
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
              {subscribed && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Thank you for subscribing!
                </p>
              )}
            </form>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="size-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} ShopForge. All rights reserved.
            </span>
          </div>

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
