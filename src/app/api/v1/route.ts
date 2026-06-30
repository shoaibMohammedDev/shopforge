// ============================================================================
// ShopForge - API V1 Health Check & Version Info
// GET /api/v1 - Returns API version information and health status
// ============================================================================

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    name: 'ShopForge API',
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString(),
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
    documentation: '/docs/api',
  })
}
