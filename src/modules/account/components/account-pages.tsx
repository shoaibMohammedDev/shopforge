/**
 * @file account-pages.tsx
 * @description Barrel export file for all account-related page components.
 * Re-exports components from decomposed module files so that consumer imports
 * (e.g. in page.tsx) remain unchanged when using a single entry point.
 *
 * @keyfeatures
 * - Centralizes all account page exports into a single import location
 * - Maintains backward compatibility with existing import paths
 * - Includes dashboard, orders, wishlist, addresses, and settings pages
 */
'use client'

// Re-export everything from decomposed files so imports in page.tsx don't need to change
export { AccountPage } from './account-dashboard'
export { AccountOrdersPage, AccountOrderDetailPage } from './account-orders'
export { AccountWishlistPage } from './account-wishlist'
export { AccountAddressesPage } from './account-addresses'
export { AccountSettingsPage } from './account-settings'
