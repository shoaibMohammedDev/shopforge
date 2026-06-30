# Task: Auth & Account Dashboard Pages for ShopForge

## Summary
Created authentication pages (Login, Register) and a full account dashboard with 6 sub-pages for the ShopForge e-commerce platform. All components are 'use client', use shadcn/ui, Lucide icons, Tailwind CSS, TypeScript, react-hook-form + zod for validation.

## Files Created

### 1. `/src/components/pages/auth/auth-pages.tsx` (496 lines)
- **LoginPage**: Centered card with ShopForge logo, email/password with icons, remember me checkbox, forgot password link, login API call (POST /api/auth with action: 'login'), auto-navigation on success, social login (Google, disabled), link to register
- **RegisterPage**: Centered card, name/email/password/confirm password with icons, password min 8 chars validation, register API call (POST /api/auth with action: 'register'), auto-login on success, link to login
- Both use react-hook-form + zod/v4 for validation
- Toast notifications for success/error via `@/hooks/use-toast`
- Framer Motion animations for card entry
- Auth store integration for login state management
- Router store for navigation

### 2. `/src/components/pages/account/account-pages.tsx` (2079 lines)
- **AccountLayout**: Shared layout with desktop sidebar (avatar, name, nav links, logout) and mobile horizontal scrollable tab bar
- **AccountPage**: Dashboard with welcome message, stats cards (Total Orders, Wishlist Items, Addresses), recent orders list, quick links
- **AccountOrdersPage**: Orders list with filter tabs (All, Pending, Processing, Shipped, Delivered, Cancelled), order cards with status badges, view details button
- **AccountOrderDetailPage**: Order detail with status timeline stepper, order items list, shipping/billing addresses, payment info, order total breakdown
- **AccountWishlistPage**: Grid of wishlist items from wishlist store, product cards with remove and add-to-cart buttons
- **AccountAddressesPage**: Address list with add/edit/delete, dialog form for address management with zod validation
- **AccountSettingsPage**: Profile form (name, readonly email), change password form, notification preferences (toggles), danger zone (delete account with alert dialog)
- All account pages have auth guard (redirect to login if not authenticated)
- Data fetching via @tanstack/react-query
- Color-coded status badges, responsive design, loading states

### 3. `/src/app/page.tsx` (updated)
- Added imports for all new page components
- Added route cases: login, register, account, account-orders, account-order-detail, account-wishlist, account-addresses, account-settings
- Added orderId to pageKey for proper remounting

### 4. `/src/app/api/addresses/route.ts` (new)
- GET: List addresses by userId with default-first ordering
- POST: Create new address with isDefault management

### 5. `/src/app/api/addresses/[id]/route.ts` (new)
- PUT: Update address with isDefault management
- DELETE: Delete address

### 6. `/src/app/api/users/[id]/route.ts` (new)
- PUT: Update user profile (name, image)

### 7. `/src/app/api/auth/route.ts` (updated)
- Added 'change-password' action with current password verification and new password hashing

## Technical Details
- Uses `zod/v4` (not `zod`) for schema validation to match project conventions
- Uses `@/hooks/use-toast` for toast notifications (matching existing project pattern)
- Uses `api` client from `@/lib/api-client` for all API calls
- Uses `useIsMobile` hook for responsive layout switching
- Uses `framer-motion` for entry animations
- All form validation via react-hook-form + zodResolver
- Proper TypeScript types throughout
- No TypeScript compilation errors in new code
