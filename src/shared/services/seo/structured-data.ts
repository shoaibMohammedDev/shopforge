/**
 * @file seo/structured-data.ts
 * @description JSON-LD structured data generators for ShopForge SEO.
 *   Produces schema.org-compliant JSON-LD objects that search engines
 *   (Google, Bing, etc.) use to render rich results — product cards
 *   with price/availability, organisation info, and breadcrumb trails.
 *
 * Key Responsibilities:
 *   - Generate Product schema with offers, ratings, and availability
 *   - Generate Organisation schema for the site-wide knowledge graph
 *   - Generate BreadcrumbList schema for navigation breadcrumbs
 *   - Ensure all output conforms to schema.org specifications
 */

/**
 * Input data required to generate a Product structured-data block.
 * Maps product entity fields to their schema.org equivalents.
 */
export interface ProductStructuredData {
  /** Product title displayed in search results. */
  name: string
  /** Detailed product description (may be truncated by search engines). */
  description: string
  /** Array of product image URLs — the first image is used as the primary thumbnail. */
  image: string[]
  /** Stock Keeping Unit identifier for the product variant. */
  sku: string
  /** Selling price in the store's display currency (e.g. 29.99). */
  price: number
  /** Three-letter ISO currency code (defaults to "USD"). */
  currency?: string
  /** Inventory availability status mapped to schema.org ItemAvailability. */
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  /** Average customer rating (1.0–5.0). Omit if the product has no reviews. */
  rating?: number
  /** Total number of customer reviews. */
  reviewCount?: number
  /** Canonical URL of the product page. */
  url?: string
  /** Brand/manufacturer name. */
  brand?: string
  /** Product category path (e.g. "Electronics > Audio > Headphones"). */
  category?: string
}

/**
 * Generate a schema.org Product JSON-LD block.
 *
 * Produces a structured-data object that includes the product name,
 * description, images, SKU, brand, category, offers (price, currency,
 * availability), and optional aggregate ratings. When embedded in a page's
 * `<script type="application/ld+json">` tag, search engines may display
 * a rich product card with price, stock status, and star ratings.
 *
 * @see https://schema.org/Product
 *
 * @param data - Product fields to include in the structured data.
 * @returns A plain object ready for `JSON.stringify()` and embedding in a page.
 */
export function generateProductSchema(data: ProductStructuredData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    description: data.description,
    image: data.image,
    sku: data.sku,
    // Nest a Brand object only when a brand name is provided
    brand: data.brand
      ? { '@type': 'Brand', name: data.brand }
      : undefined,
    category: data.category,
    url: data.url,
    offers: {
      '@type': 'Offer',
      // Format price with exactly two decimal places as required by schema.org
      price: data.price.toFixed(2),
      priceCurrency: data.currency || 'USD',
      availability: `https://schema.org/${data.availability}`,
      url: data.url,
    },
    // Include aggregate rating only when at least one rating exists
    aggregateRating: data.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: data.rating.toFixed(1),
          reviewCount: data.reviewCount || 0,
          bestRating: '5',
          worstRating: '1',
        }
      : undefined,
  }
}

/**
 * Generate a schema.org Organization JSON-LD block.
 *
 * Supplies general information about the business (name, URL, logo,
 * contact point) that search engines use to build a knowledge-graph
 * panel. This block is typically included site-wide in the root layout.
 *
 * @returns A plain object representing the Organization schema.
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ShopForge',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://shopforge.dev',
    logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.svg`,
    // Social profile URLs can be added here (Twitter, Facebook, etc.)
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@shopforge.dev',
    },
  }
}

/**
 * Generate a schema.org BreadcrumbList JSON-LD block.
 *
 * Breadcrumbs help search engines understand the site hierarchy and may
 * replace the raw URL in search results with a clickable breadcrumb trail
 * (e.g. "Home > Electronics > Headphones"), improving click-through rates.
 *
 * @param items - Ordered array of breadcrumb items from root to current page.
 *                Each item contains a display `name` and a `url`.
 * @returns A plain object representing the BreadcrumbList schema.
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    // Position is 1-indexed as required by schema.org ListItem
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
