/**
 * @file route.ts (Brands API)
 * @description Brands listing API route handler for the ShopForge e-commerce platform.
 *              Retrieves all active brands along with the count of active products
 *              associated with each brand. Used by the storefront to display brand
 *              filters and brand landing pages.
 *
 * @endpoint GET /api/brands — List all active brands with product counts
 *
 * @auth None — Public endpoint, no authentication required.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Handles GET requests to retrieve all active brands.
 *
 * @description Fetches all brands where `isActive` is true, including an
 *              aggregated count of active products for each brand. Results
 *              are sorted alphabetically by brand name.
 *
 * @param _request - The incoming Next.js Request object (unused, no query params).
 *
 * @returns JSON array of brand objects, each with an `_count.products` field.
 *
 * @response 200 - Application/json — Array of active brands.
 *   [
 *     { "id": "brand_1", "name": "Acme", "slug": "acme", "isActive": true, "_count": { "products": 12 } },
 *     ...
 *   ]
 * @response 500 - Application/json — Database or server error.
 *   { "error": "Failed to fetch brands" }
 *
 * @example
 * // Request
 * GET /api/brands
 *
 * // Response
 * [
 *   { "id": "brand_1", "name": "Acme", "slug": "acme", "logo": "/logos/acme.png", "isActive": true, "_count": { "products": 12 } },
 *   { "id": "brand_2", "name": "BetaCorp", "slug": "betacorp", "logo": "/logos/beta.png", "isActive": true, "_count": { "products": 5 } }
 * ]
 */
export async function GET() {
  try {
    // Fetch only active brands; include a count of active products per brand
    // so the UI can display product counts in brand filters/carousels
    const brands = await db.brand.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(brands)
  } catch (error) {
    console.error('Brands API error:', error)
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}
