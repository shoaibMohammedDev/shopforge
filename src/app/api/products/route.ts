// ============================================================================
// ShopForge - Products API Route (Service Layer Pattern)
// GET /api/products - List products with filters, search, pagination
// ============================================================================

import { NextResponse } from 'next/server'
import { productService } from '@/features/products/services/product.service'
import { productQuerySchema } from '@/lib/validators'
import { handleApiError, ValidationError } from '@/lib/errors'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())

    // Validate query parameters with Zod
    const parsed = productQuerySchema.safeParse(params)
    if (!parsed.success) {
      const errors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      return NextResponse.json(
        { success: false, error: errors, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Delegate to service layer
    const result = await productService.getProducts(parsed.data)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
