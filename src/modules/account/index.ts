/**
 * @file modules/account/index.ts
 * @description Barrel export for the Account module.
 */
export { AccountLayout } from './components/account-layout'
export { AccountPage as AccountDashboard } from './components/account-dashboard'
export { AccountOrdersPage as AccountOrders, AccountOrderDetailPage as OrderDetailPage } from './components/account-orders'
export { AccountWishlistPage as AccountWishlist } from './components/account-wishlist'
export { AccountAddressesPage as AccountAddresses } from './components/account-addresses'
export { AccountSettingsPage as AccountSettings } from './components/account-settings'
