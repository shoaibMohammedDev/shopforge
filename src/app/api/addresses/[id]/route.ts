/**
 * @file route.ts (Single Address API)
 * @description Single address operations API route handler for the ShopForge e-commerce platform.
 *              Provides endpoints for updating and deleting a specific address by ID.
 *              Supports partial updates — only fields included in the request body
 *              will be modified. Enforces the single-default-address constraint when
 *              the `isDefault` flag is changed.
 *
 * @endpoint PUT    /api/addresses/[id] — Update an existing address
 * @endpoint DELETE /api/addresses/[id] — Delete an address
 *
 * @auth User — Both endpoints require the address to belong to the requesting user.
 *              The `userId` field should be verified against the authenticated session
 *              in production.
 */

import { NextResponse } from 'next/server'
import { db } from "@/infrastructure/database"

/**
 * Handles PUT requests to update an existing address.
 *
 * @description Performs a partial update on the address identified by the
 *              route `id` parameter. Only fields present in the request body
 *              are modified; absent fields remain unchanged. If the `isDefault`
 *              flag is being set to `true`, all other addresses for the same
 *              user are automatically unset as default first.
 *
 * @param request - The incoming Next.js Request object with JSON body.
 * @param params  - Route params containing the address `id`.
 *
 * @bodyParam label      - Updated label (string, optional).
 * @bodyParam firstName  - Updated first name (string, optional).
 * @bodyParam lastName   - Updated last name (string, optional).
 * @bodyParam street1    - Updated street line 1 (string, optional).
 * @bodyParam street2    - Updated street line 2 (string, optional — pass empty to clear).
 * @bodyParam city       - Updated city (string, optional).
 * @bodyParam state      - Updated state/province (string, optional).
 * @bodyParam postalCode - Updated postal code (string, optional).
 * @bodyParam country    - Updated country code (string, optional).
 * @bodyParam phone      - Updated phone number (string, optional — pass empty to clear).
 * @bodyParam isDefault  - Set as default address (boolean, optional).
 * @bodyParam userId     - User ID for default address management (string, optional —
 *                          falls back to the existing address's userId if not provided).
 *
 * @returns JSON response with the updated address object.
 *
 * @response 200 - Application/json — Address updated successfully.
 *   { "id": "addr_1", "firstName": "Jane", ... "isDefault": true }
 * @response 404 - Application/json — Address not found.
 *   { "error": "Address not found" }
 * @response 500 - Application/json — Database or server error.
 *   { "error": "Failed to update address" }
 *
 * @example
 * // Request
 * PUT /api/addresses/addr_1
 * { "firstName": "Janet", "isDefault": true }
 *
 * // Response
 * { "id": "addr_1", "firstName": "Janet", "lastName": "Doe", ... "isDefault": true }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      label, firstName, lastName, street1, street2,
      city, state, postalCode, country, phone, isDefault, userId,
    } = body

    // Verify the address exists before attempting an update
    const existing = await db.address.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // If setting this address as default (and it isn't already), unset all
    // other default addresses for the same user to enforce a single-default constraint
    if (isDefault && !existing.isDefault) {
      await db.address.updateMany({
        where: { userId: userId || existing.userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    // Build the update data object — uses a conditional spread pattern:
    // - For string fields: only update if a truthy value is provided (undefined = no change)
    // - For nullable fields (label, street2, phone): empty string coerces to null
    // - For isDefault: only update if explicitly provided (handles boolean false correctly)
    const address = await db.address.update({
      where: { id },
      data: {
        label: label !== undefined ? (label || null) : undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        street1: street1 || undefined,
        street2: street2 !== undefined ? (street2 || null) : undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
        phone: phone !== undefined ? (phone || null) : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
      },
    })

    return NextResponse.json(address)
  } catch (error) {
    console.error('Update address API error:', error)
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 })
  }
}

/**
 * Handles DELETE requests to remove an address.
 *
 * @description Permanently deletes the address identified by the route `id`
 *              parameter. Performs an existence check first to return a
 *              meaningful 404 if the address has already been deleted or
 *              never existed.
 *
 * @param request - The incoming Next.js Request object (unused beyond routing).
 * @param params  - Route params containing the address `id`.
 *
 * @returns JSON response confirming deletion.
 *
 * @response 200 - Application/json — Address deleted successfully.
 *   { "success": true }
 * @response 404 - Application/json — Address not found.
 *   { "error": "Address not found" }
 * @response 500 - Application/json — Database or server error.
 *   { "error": "Failed to delete address" }
 *
 * @example
 * // Request
 * DELETE /api/addresses/addr_1
 *
 * // Response
 * { "success": true }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify the address exists before attempting deletion
    const existing = await db.address.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    // Permanently remove the address record
    await db.address.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete address API error:', error)
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 })
  }
}
