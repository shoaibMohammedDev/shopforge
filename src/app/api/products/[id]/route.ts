/**
 * @file route.ts (Single Product API)
 * @description Single product detail API route handler for the ShopForge e-commerce platform.
 *              Retrieves comprehensive product details by ID or slug, including
 *              category, brand, variants, inventory levels, tags, approved reviews,
 *              active flash sales, and related products from the same category.
 *
 * @endpoint GET /api/products/[id] — Get detailed product information
 *
 * @auth None — Public endpoint; product detail viewing does not require authentication.
 */

import { NextResponse } from 'next/server'
import { db } from "@/infrastructure/database"

/**
 * Handles GET requests to retrieve a single product's full details.
 *
 * @description Attempts to find a product by its database ID first, then
 *              falls back to a slug-based lookup if the ID doesn't match.
 *              This dual-lookup strategy supports both internal references
 *              (e.g., /api/products/prod_123) and SEO-friendly URLs
 *              (e.g., /api/products/wireless-headphones).
 *
 *              The response includes:
 *              - **Category & Brand**: Basic info for breadcrumbs and filters
 *              - **Variants**: Active product variants with inventory data
 *              - **Inventory**: Stock levels, reserved quantities, and SKU info
 *              - **Tags**: Product tags for search and filtering
 *              - **Reviews**: Up to 20 approved reviews, newest first, with user info
 *              - **Flash Sales**: Any active flash sale pricing for the product
 *              - **Related Products**: Up to 4 top-selling products from the same category
 *
 * @param request - The incoming Next.js Request object (unused beyond routing).
 * @param params  - Route params containing the product `id` (which may be a
 *                   database ID or a URL slug).
 *
 * @returns JSON response with the product object and a `relatedProducts` array.
 *
 * @response 200 - Application/json — Product found with full details.
 *   {
 *     "id": "prod_1",
 *     "name": "Wireless Headphones",
 *     "slug": "wireless-headphones",
 *     "price": 79.99,
 *     "category": { "id": "cat_1", "name": "Electronics", "slug": "electronics" },
 *     "brand": { "id": "brand_1", "name": "Acme", "slug": "acme" },
 *     "variants": [...],
 *     "inventory": [...],
 *     "tags": [...],
 *     "reviews": [...],
 *     "flashSales": [...],
 *     "relatedProducts": [...]
 *   }
 * @response 404 - Application/json — Product not found by ID or slug.
 *   { "error": "Product not found" }
 * @response 500 - Application/json — Database or server error.
 *   { "error": "Failed to fetch product" }
 *
 * @example
 * // Lookup by database ID
 * GET /api/products/prod_abc123
 *
 * // Lookup by URL slug
 * GET /api/products/wireless-headphones
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Primary lookup: try to find the product by its database ID first.
    // This is the most common path for internal API calls.
    let product = await db.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          include: {
            inventory: { select: { id: true, quantity: true, reserved: true } },
          },
        },
        inventory: { select: { id: true, quantity: true, reserved: true, lowStockThreshold: true, sku: true } },
        tags: { select: { tag: true } },
        // Only include approved reviews to prevent unmoderated content from showing
        reviews: {
          where: { isApproved: true },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        // Only include flash sales that are currently active (within the start/end window)
        flashSales: {
          where: { flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
          include: { flashSale: { select: { isActive: true, startsAt: true, endsAt: true } } },
        },
      },
    })

    // Fallback lookup: if no product was found by ID, try matching by slug.
    // This supports SEO-friendly URLs like /api/products/wireless-headphones
    if (!product) {
      product = await db.product.findUnique({
        where: { slug: id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          variants: {
            where: { isActive: true },
            include: {
              inventory: { select: { id: true, quantity: true, reserved: true } },
            },
          },
          inventory: { select: { id: true, quantity: true, reserved: true, lowStockThreshold: true, sku: true } },
          tags: { select: { tag: true } },
          reviews: {
            where: { isApproved: true },
            include: { user: { select: { id: true, name: true, image: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          flashSales: {
            where: { flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } } },
            include: { flashSale: { select: { isActive: true, startsAt: true, endsAt: true } } },
          },
        },
      })
    }

    // Neither ID nor slug matched any product in the database
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Fetch related products from the same category, excluding the current product.
    // Sorted by total sales to surface the most popular items.
    const related = await db.product.findMany({
      where: {
        categoryId: product.categoryId,
        isActive: true,
        id: { not: product.id },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        inventory: { select: { quantity: true, reserved: true } },
        tags: { select: { tag: true } },
      },
      take: 4,
      orderBy: { totalSold: 'desc' },
    })

    // Merge the product details with related products for the complete response
    return NextResponse.json({ ...product, relatedProducts: related })
  } catch (error) {
    console.error('Product detail API error:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}
