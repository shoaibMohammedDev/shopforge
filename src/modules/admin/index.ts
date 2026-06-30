/**
 * @file modules/admin/index.ts
 * @description Barrel export for the Admin module.
 */
export { AdminPage } from './components/admin-page'
export { AdminDashboardContent as AdminDashboard } from './components/admin-dashboard'
export { AdminProductsContent as AdminProducts } from './components/admin-products'
export { AdminOrdersContent as AdminOrders } from './components/admin-orders'
export { AdminCustomersContent as AdminCustomers } from './components/admin-customers'
export { AdminCouponsContent as AdminCoupons } from './components/admin-coupons'
export { AdminReviewsContent as AdminReviews } from './components/admin-reviews'
export { AdminSettingsContent as AdminSettings } from './components/admin-settings'
export { adminService } from './services/admin.service'
