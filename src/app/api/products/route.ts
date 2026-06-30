/**
 * @file route.ts (Products API)
 * @description Products listing API route handler for the ShopForge e-commerce platform.
 *              Supports filtered, searched, sorted, and paginated product queries.
 *              Uses a service-layer pattern — query parsing and validation happens
 *              in the route handler, while the complex filtering/pagination logic
 *              is delegated to the product service.
 *
 * @endpoint GET /api/products — List products with filters, search, sorting, and pagination
 *
 * @auth None — Public endpoint; product browsing does not require authentication.
 */

import { NextResponse } from 'next/server'
import { productService } from '@/features/products/services/product.service'
import { productQuerySchema } from '@/lib/validators'
import { handleApiError, ValidationError } from '@/lib/errors'

/**
 * Handles GET requests to list and filter products.
 *
 * @description Accepts a variety of query parameters for filtering, searching,
 *              sorting, and paginating products. All parameters are validated
 *              against the Zod `productQuerySchema` before being passed to the
 *              product service. The service returns a paginated result set
 *              with product details, inventory info, and pagination metadata.
 *
 * @param request - The incoming Next.js Request object.
 *
 * @queryParam page       - Page number for pagination (number, default: 1).
 * @queryParam limit      - Items per page (number, default: 12, max: 50).
 * @queryParam search     - Full-text search query against product name/description (string, optional).
 * @queryParam category   - Filter by category slug (string, optional).
 * @queryParam brand      - Filter by brand slug (string, optional).
 * @queryParam minPrice   - Minimum price filter (number, optional).
 * @queryParam maxPrice   - Maximum price filter (number, optional).
 * @queryParam sort       - Sort field and direction, e.g. "price_asc", "created_desc" (string, optional).
 * @queryParam tags       - Comma-separated tag filter (string, optional).
 * @queryParam featured   - Filter for featured products only (boolean, optional).
 * @queryParam onSale     - Filter for products currently on sale (boolean, optional).
 *
 * @returns JSON response with paginated product data and metadata.
 *
 * @response 200 - Application/json — Paginated product list.
 *   {
 *     "products": [{ "id": "prod_1", "name": "...", "price": 29.99, ... }],
 *     "pagination": { "page": 1, "limit": 12, "total": 150, "totalPages": 13 }
 *   }
 * @response 400 - Application/json — Validation error (invalid query params).
 *   { "success": false, "error": "page: Must be a positive number", "code": "VALIDATION_ERROR" }
 * @response 500 - Application/json — Server error (handled by handleApiError).
 *
 * @example
 * // Basic product listing
 * GET /api/products
 *
 * // Search with filters
 * GET /api/products?search=wireless&category=electronics&minPrice=10&maxPrice=200&sort=price_asc&page=2&limit=20
 *
 * // Featured products on sale
 * GET /api/products?featured=true&onSale=true
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // Convert URL search params to a plain object for Zod validation
    const params = Object.fromEntries(searchParams.entries())

    // Validate query parameters with Zod — ensures types are correct
    // (e.g., page is a number, minPrice/maxPrice are valid) before
    // passing to the product service
    const parsed = productQuerySchema.safeParse(params)
    if (!parsed.success) {
      // Flatten Zod issues into a human-readable error string
      const errors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      return NextResponse.json(
        { success: false, error: errors, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Delegate to service layer — handles Prisma query construction,
    // filtering, joins, sorting, and pagination logic
    const result = await productService.getProducts(parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
