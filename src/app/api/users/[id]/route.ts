/**
 * @file route.ts (User API)
 * @description User profile API route handler for the ShopForge e-commerce platform.
 *              Provides an endpoint for updating a user's profile information,
 *              specifically their display name and avatar image. Ensures the
 *              password hash is never included in API responses.
 *
 * @endpoint PUT /api/users/[id] — Update user profile
 *
 * @auth User — The `id` parameter should be validated against the authenticated
 *              session to ensure users can only update their own profile.
 *              Admin users may be permitted to update any user's profile.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Handles PUT requests to update a user's profile.
 *
 * @description Updates the specified user's profile fields. Currently supports
 *              updating the display `name` and avatar `image`. Only fields
 *              explicitly provided in the request body are modified; absent
 *              fields remain unchanged. The password hash is always stripped
 *              from the response using object destructuring to prevent
 *              sensitive data leakage.
 *
 * @param request - The incoming Next.js Request object with JSON body.
 * @param params  - Route params containing the user `id`.
 *
 * @bodyParam name  - Updated display name (string, optional).
 * @bodyParam image - Updated avatar image URL (string, optional).
 *
 * @returns JSON response with the updated user object (password hash excluded).
 *
 * @response 200 - Application/json — User profile updated successfully.
 *   { "id": "user_123", "name": "Jane Doe", "email": "jane@example.com", "image": "/avatars/jane.png" }
 * @response 404 - Application/json — User not found.
 *   { "error": "User not found" }
 * @response 500 - Application/json — Database or server error.
 *   { "error": "Failed to update user" }
 *
 * @example
 * // Request
 * PUT /api/users/user_123
 * { "name": "Jane Doe", "image": "/avatars/jane-new.png" }
 *
 * // Response
 * { "id": "user_123", "name": "Jane Doe", "email": "jane@example.com", "image": "/avatars/jane-new.png", "createdAt": "..." }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, image } = body

    // Verify the user exists before attempting an update
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build update data using conditional spread — only include fields
    // that were explicitly provided in the request body
    const user = await db.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(image !== undefined && { image }),
      },
    })

    // Strip the password hash from the response to prevent sensitive data leakage.
    // The `_` variable prefix is a convention indicating an intentionally unused variable.
    const { passwordHash: _, ...safeUser } = user
    return NextResponse.json(safeUser)
  } catch (error) {
    console.error('Update user API error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
