/**
 * @file route.ts (API V1 Health Check)
 * @description API version 1 health check and discovery endpoint for the ShopForge
 *              e-commerce platform. Returns the current API version, health status,
 *              server timestamp, and a directory of all available API endpoints.
 *              Used by monitoring systems to verify service availability and by
 *              client applications to discover available API routes.
 *
 * @endpoint GET /api/v1 — API version info and health status
 *
 * @auth None — Public endpoint; no authentication required. Intended for
 *              monitoring, health checks, and API discovery.
 */

import { NextResponse } from 'next/server'

/**
 * Handles GET requests for API health check and version discovery.
 *
 * @description Returns a JSON object containing the API name, version,
 *              current health status, server timestamp, and a map of all
 *              available API endpoints. The `endpoints` field serves as a
 *              machine-readable API directory that clients can use to
 *              dynamically discover available routes.
 *
 * @param _request - The incoming Next.js Request object (unused).
 *
 * @returns JSON response with API metadata.
 *
 * @response 200 - Application/json — API health and version info.
 *   {
 *     "name": "ShopForge API",
 *     "version": "v1",
 *     "status": "healthy",
 *     "timestamp": "2025-01-15T10:30:00.000Z",
 *     "endpoints": {
 *       "auth": "/api/auth",
 *       "products": "/api/products",
 *       "categories": "/api/categories",
 *       "brands": "/api/brands",
 *       "orders": "/api/orders",
 *       "coupons": "/api/coupons",
 *       "addresses": "/api/addresses",
 *       "admin": "/api/admin"
 *     },
 *     "documentation": "/docs/api"
 *   }
 *
 * @example
 * // Request
 * GET /api/v1
 *
 * // Response
 * {
 *   "name": "ShopForge API",
 *   "version": "v1",
 *   "status": "healthy",
 *   "timestamp": "2025-01-15T10:30:00.000Z",
 *   "endpoints": { "auth": "/api/auth", "products": "/api/products", ... },
 *   "documentation": "/docs/api"
 * }
 */
export async function GET() {
  return NextResponse.json({
    name: 'ShopForge API',
    version: 'v1',
    status: 'healthy',
    // Current server timestamp for time-sync verification and cache busting
    timestamp: new Date().toISOString(),
    // Directory of all available API endpoints for client-side discovery
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      brands: '/api/brands',
      orders: '/api/orders',
      coupons: '/api/coupons',
      addresses: '/api/addresses',
      admin: '/api/admin',
    },
    // Link to the full API documentation (if available)
    documentation: '/docs/api',
  })
}
