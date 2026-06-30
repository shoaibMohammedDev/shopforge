/**
 * @file route.ts (Addresses API)
 * @description Addresses CRUD API route handler for the ShopForge e-commerce platform.
 *              Provides endpoints for listing a user's shipping addresses and
 *              creating new addresses. Addresses are used for order shipping
 *              and billing. Supports a "default" address flag — when a new
 *              address is set as default, all other addresses for that user
 *              are automatically unset.
 *
 * @endpoint GET  /api/addresses — List all addresses for a user
 * @endpoint POST /api/addresses — Create a new address
 *
 * @auth User — Both endpoints require a `userId` parameter. In production,
 *              this should be derived from the authenticated session token
 *              rather than passed directly.
 */

import { NextResponse } from 'next/server'
import { db } from "@/infrastructure/database"

/**
 * Handles GET requests to retrieve a user's addresses.
 *
 * @description Returns all addresses for the specified user, sorted with
 *              the default address first (isDefault: desc), then by most
 *              recently created. This ordering ensures the user's preferred
 *              shipping address always appears at the top of the list.
 *
 * @param request - The incoming Next.js Request object.
 *
 * @queryParam userId - The user ID whose addresses to retrieve (string, required).
 *
 * @returns JSON array of address objects.
 *
 * @response 200 - Application/json — Array of addresses.
 *   [
 *     { "id": "addr_1", "userId": "user_123", "label": "Home", "firstName": "Jane", "lastName": "Doe", "street1": "123 Main St", "city": "Springfield", "state": "IL", "postalCode": "62701", "country": "US", "isDefault": true },
 *     ...
 *   ]
 * @response 400 - Application/json — Missing userId parameter.
 *   { "error": "userId required" }
 * @response 500 - Application/json — Database or server error.
 *   { "error": "Failed to fetch addresses" }
 *
 * @example
 * // Request
 * GET /api/addresses?userId=user_123
 *
 * // Response
 * [
 *   { "id": "addr_1", "label": "Home", "isDefault": true, ... },
 *   { "id": "addr_2", "label": "Office", "isDefault": false, ... }
 * ]
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Fetch addresses sorted with the default address first, then newest first.
    // This ensures the user's preferred shipping address is always at the top.
    const addresses = await db.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Addresses API error:', error)
    return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 })
  }
}

/**
 * Handles POST requests to create a new address.
 *
 * @description Creates a new shipping address for a user. If the address is
 *              marked as default (`isDefault: true`), all other addresses for
 *              that user are automatically unset as default first to ensure
 *              only one default address exists per user.
 *
 * @param request - The incoming Next.js Request object with JSON body.
 *
 * @bodyParam userId     - The user ID to associate the address with (string, required).
 * @bodyParam label      - A friendly label for the address, e.g. "Home", "Office" (string, optional).
 * @bodyParam firstName  - Recipient's first name (string, required).
 * @bodyParam lastName   - Recipient's last name (string, required).
 * @bodyParam street1    - Primary street address line (string, required).
 * @bodyParam street2    - Secondary street address line, e.g. apt/suite (string, optional).
 * @bodyParam city       - City name (string, required).
 * @bodyParam state      - State or province (string, required).
 * @bodyParam postalCode - ZIP or postal code (string, required).
 * @bodyParam country    - Country code, e.g. "US", "GB" (string, required).
 * @bodyParam phone      - Contact phone number (string, optional).
 * @bodyParam isDefault  - Whether this should be the user's default address (boolean, optional, default: false).
 *
 * @returns JSON response with the created address object.
 *
 * @response 201 - Application/json — Address created successfully.
 *   { "id": "addr_3", "userId": "user_123", "label": "Home", "firstName": "Jane", ... "isDefault": true }
 * @response 400 - Application/json — Missing required fields.
 *   { "error": "Missing required fields" }
 * @response 500 - Application/json — Database or server error.
 *   { "error": "Failed to create address" }
 *
 * @example
 * // Request
 * POST /api/addresses
 * {
 *   "userId": "user_123",
 *   "label": "Home",
 *   "firstName": "Jane",
 *   "lastName": "Doe",
 *   "street1": "123 Main St",
 *   "city": "Springfield",
 *   "state": "IL",
 *   "postalCode": "62701",
 *   "country": "US",
 *   "phone": "+15551234567",
 *   "isDefault": true
 * }
 *
 * // Response (201)
 * { "id": "addr_3", "userId": "user_123", "label": "Home", "firstName": "Jane", "lastName": "Doe", ... }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      userId, label, firstName, lastName, street1, street2,
      city, state, postalCode, country, phone, isDefault,
    } = body

    // Validate all required address fields are present
    if (!userId || !firstName || !lastName || !street1 || !city || !state || !postalCode || !country) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If this address is being set as default, unset any existing default
    // addresses for the same user to enforce a single-default constraint
    if (isDefault) {
      await db.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    // Create the new address record with optional fields coerced to null if empty
    const address = await db.address.create({
      data: {
        userId,
        label: label || null,
        firstName,
        lastName,
        street1,
        street2: street2 || null,
        city,
        state,
        postalCode,
        country,
        phone: phone || null,
        isDefault: isDefault || false,
      },
    })

    return NextResponse.json(address, { status: 201 })
  } catch (error) {
    console.error('Create address API error:', error)
    return NextResponse.json({ error: 'Failed to create address' }, { status: 500 })
  }
}
