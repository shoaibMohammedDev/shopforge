// ============================================================================
// ShopForge - Structured Data (JSON-LD)
// Provides rich search results with product schema markup
// ============================================================================

export interface ProductStructuredData {
  name: string
  description: string
  image: string[]
  sku: string
  price: number
  currency?: string
  availability: 'InStock' | 'OutOfStock' | 'PreOrder'
  rating?: number
  reviewCount?: number
  url?: string
  brand?: string
  category?: string
}

/**
 * Generate Product structured data for JSON-LD
 * https://schema.org/Product
 */
export function generateProductSchema(data: ProductStructuredData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: data.name,
    description: data.description,
    image: data.image,
    sku: data.sku,
    brand: data.brand
      ? { '@type': 'Brand', name: data.brand }
      : undefined,
    category: data.category,
    url: data.url,
    offers: {
      '@type': 'Offer',
      price: data.price.toFixed(2),
      priceCurrency: data.currency || 'USD',
      availability: `https://schema.org/${data.availability}`,
      url: data.url,
    },
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
 * Generate Organization structured data
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ShopForge',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://shopforge.dev',
    logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.svg`,
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@shopforge.dev',
    },
  }
}

/**
 * Generate BreadcrumbList structured data
 */
export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
