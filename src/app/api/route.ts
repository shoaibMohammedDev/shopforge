/**
 * @file route.ts
 * @description API root endpoint for the ShopForge e-commerce application.
 *              Provides a simple health check / greeting response to confirm
 *              the API server is running and reachable.
 *
 * @endpoint GET /api
 * @auth None — Public endpoint, no authentication required.
 */

import { NextResponse } from "next/server";

/**
 * Handles GET requests to the API root.
 *
 * @description Returns a simple JSON greeting message used as a health check
 *              to verify that the ShopForge API server is operational.
 *
 * @param _request - The incoming Next.js Request object (unused).
 *
 * @returns A JSON response with a greeting message.
 *
 * @response 200 - Application/json
 *   {
 *     "message": "Hello, world!"
 *   }
 *
 * @example
 * // Request
 * GET /api
 *
 * // Response
 * { "message": "Hello, world!" }
 */
export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}
