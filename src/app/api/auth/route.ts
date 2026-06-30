// ============================================================================
// ShopForge - Auth API Route (Service Layer Pattern)
// POST /api/auth - Login / Register / Verify / Change Password
// ============================================================================

import { NextResponse } from 'next/server'
import { authService } from '@/features/auth/services/auth.service'
import { authSchema } from '@/lib/validators'
import { handleApiError, ValidationError } from '@/lib/errors'
import { apiLogger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input with Zod schema
    const parsed = authSchema.safeParse(body)
    if (!parsed.success) {
      const fields: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path.join('.'))
        if (!fields[key]) fields[key] = []
        fields[key].push(issue.message)
      }
      throw new ValidationError('Invalid input', fields)
    }

    // Delegate to service layer
    const result = await authService.handleAuthRequest(parsed.data as any)

    // Return appropriate status code
    const status = parsed.data.action === 'register' ? 201 : 200
    return NextResponse.json({ success: true, data: result }, { status })
  } catch (error) {
    return handleApiError(error)
  }
}
