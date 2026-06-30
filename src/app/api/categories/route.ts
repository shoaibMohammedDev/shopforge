/**
 * @file route.ts (Categories API)
 * @description Categories listing API route handler for the ShopForge e-commerce platform.
 *              Retrieves all active top-level categories along with their child
 *              subcategories and the count of active products in each. Used by
 *              the storefront for category navigation menus and filter sidebars.
 *
 * @endpoint GET /api/categories — List all active categories with subcategories and product counts
 *
 * @auth None — Public endpoint, no authentication required.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

/**
 * Handles GET requests to retrieve the category tree.
 *
 * @description Fetches all active top-level categories (where `parentId` is null)
 *              and includes their active child subcategories. Each category and
 *              subcategory includes an aggregated count of active products.
 *              Results are sorted by the `sortOrder` field for consistent display.
 *
 * @param _request - The incoming Next.js Request object (unused, no query params).
 *
 * @returns JSON array of top-level category objects, each with nested `children`
 *          and `_count.products` fields.
 *
 * @response 200 - Application/json — Array of active top-level categories with children.
 *   [
 *     {
 *       "id": "cat_1", "name": "Electronics", "slug": "electronics", "parentId": null,
 *       "_count": { "products": 45 },
 *       "children": [
 *         { "id": "cat_2", "name": "Phones", "slug": "phones", "parentId": "cat_1", "_count": { "products": 20 } },
 *         ...
 *       ]
 *     },
 *     ...
 *   ]
 * @response 500 - Application/json — Database or server error (handled by handleApiError).
 *
 * @example
 * // Request
 * GET /api/categories
 *
 * // Response
 * [
 *   { "id": "cat_1", "name": "Electronics", "slug": "electronics", "sortOrder": 1, "isActive": true, "_count": { "products": 45 }, "children": [...] },
 *   { "id": "cat_5", "name": "Clothing", "slug": "clothing", "sortOrder": 2, "isActive": true, "_count": { "products": 30 }, "children": [...] }
 * ]
 */
export async function GET() {
  try {
    // Fetch top-level categories (parentId: null) with nested children;
    // both levels include a count of active products for UI filter badges
    const result = await db.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
        children: {
          where: { isActive: true },
          include: {
            _count: { select: { products: { where: { isActive: true } } } },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
