# ShopForge

Production-grade full-stack e-commerce platform built with **Next.js 16**, **React 19**, **TypeScript**, and **Prisma**.

---

## Overview

ShopForge is a modern, feature-rich e-commerce application designed with industry-standard architecture, clean code principles, and production-ready infrastructure. It ships with a complete customer storefront, a full admin dashboard, secure authentication, payment integration, and a modular codebase that scales.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS v4, shadcn/ui (48 components) |
| **Language** | TypeScript (strict mode) |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| **State Management** | Zustand, TanStack React Query |
| **Authentication** | NextAuth.js with CSRF protection |
| **Payments** | Stripe |
| **Forms** | React Hook Form + Zod validation |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Tables** | TanStack React Table |
| **Rich Text** | MDX Editor |
| **Testing** | Vitest, Playwright, Testing Library |
| **Linting** | ESLint, Prettier, Husky, lint-staged, Commitlint |
| **API Security** | Rate limiting, CSRF tokens, security headers, CORS |

---

## Features

### Customer Storefront
- **Product Browsing** — Category and brand filtering, search, sort, and pagination
- **Product Details** — Image galleries, variants, inventory status, reviews, and ratings
- **Shopping Cart** — Add, remove, update quantities with persistent Zustand store
- **Checkout** — Multi-step checkout with address management and Stripe payment
- **Wishlist** — Save products for later with dedicated wishlist page
- **User Accounts** — Profile settings, order history, address book, and dashboard
- **Authentication** — Login, registration, session management with NextAuth.js
- **Flash Sales** — Time-limited deals with countdown timers
- **Recently Viewed** — Automatic product browsing history tracking
- **Responsive Design** — Mobile-first layout with drawer-based navigation

### Admin Dashboard
- **Analytics Dashboard** — Revenue, orders, customers, and product metrics with Recharts
- **Product Management** — CRUD operations, variants, inventory, and image uploads
- **Order Management** — Order timeline, status updates, and fulfillment tracking
- **Customer Management** — Customer list, details, and activity overview
- **Coupon Management** — Create and manage discount codes with usage limits
- **Review Moderation** — Approve, reject, and feature product reviews
- **Store Settings** — Configure store name, branding, and operational preferences
- **Drag & Drop** — Sortable admin interfaces with dnd-kit

### Infrastructure
- **28 Prisma Models** — Full e-commerce data model with relations, indexes, and constraints
- **Repository Pattern** — Data access layer with base repository abstraction
- **DTO Validation** — Zod schemas for every API input
- **API Versioning** — `/api/v1` namespace with version headers
- **Middleware** — Rate limiting, CSRF protection, security headers, request tracing
- **Structured Logging** — JSON logger with configurable levels and formats
- **Error Handling** — Centralized error types with consistent API responses
- **SEO** — Sitemap generation, meta tags, and Open Graph support
- **Database Seeding** — Comprehensive seed script with realistic sample data

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── api/                    # API routes
│   │   ├── addresses/          # Address CRUD
│   │   ├── admin/              # Admin endpoints
│   │   ├── auth/               # Authentication
│   │   ├── brands/             # Brand listing
│   │   ├── categories/         # Category listing
│   │   ├── coupons/            # Coupon management
│   │   ├── orders/             # Order management
│   │   ├── products/           # Product CRUD + search
│   │   └── users/              # User management
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home page
│   ├── sitemap.ts              # Dynamic sitemap
│   └── not-found.tsx           # 404 page
│
├── modules/                    # Feature modules (domain-driven)
│   ├── account/                # User account pages & settings
│   ├── admin/                  # Admin dashboard & management
│   ├── auth/                   # Authentication (service, repo, store, DTO)
│   ├── cart/                   # Shopping cart (store + page)
│   ├── checkout/               # Checkout flow
│   ├── coupons/                # Coupon service & DTO
│   ├── orders/                 # Order service, repo, & DTO
│   ├── products/               # Product service, repo, components, & DTO
│   └── wishlist/               # Wishlist store
│
├── shared/                     # Shared utilities & components
│   ├── components/
│   │   ├── home/               # Home page component
│   │   ├── layout/             # Header, footer, providers
│   │   └── ui/                 # 48 shadcn/ui components
│   ├── hooks/                  # useMobile, useToast
│   ├── lib/
│   │   ├── api-client/         # Type-safe API client
│   │   ├── config/             # Zod-validated env config
│   │   ├── csrf/               # CSRF token management
│   │   ├── errors/             # Custom error classes
│   │   ├── logger/             # Structured JSON logger
│   │   └── utils/              # cn(), formatters, helpers
│   ├── services/seo/           # SEO metadata generation
│   ├── stores/                 # Router store (Zustand)
│   ├── types/                  # Shared TypeScript types
│   └── validators/             # Zod validation schemas
│
├── infrastructure/             # Data layer
│   ├── base-repository/        # Generic CRUD repository
│   └── database/               # Prisma client singleton
│
└── middleware.ts               # Rate limiting, CSRF, security headers
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm**, **yarn**, or **bun**

### Installation

```bash
# Clone the repository
git clone https://github.com/shoaibMohammedDev/shopforge.git
cd shopforge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Set up the database
npx prisma generate
npx prisma db push

# Seed with sample data (optional)
npm run db:seed

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Database connection string |
| `NEXTAUTH_SECRET` | No | NextAuth.js session secret |
| `STRIPE_SECRET_KEY` | No | Stripe server-side key |
| `STRIPE_PUBLIC_KEY` | No | Stripe client-side key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook verification |
| `RESEND_API_KEY` | No | Resend email API key |
| `REDIS_URL` | No | Redis for sessions/caching |
| `NEXT_PUBLIC_APP_URL` | No | App URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_NAME` | No | App display name (default: `ShopForge`) |

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build with standalone output |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without changes |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:migrate:prod` | Run migrations in production |
| `npm run db:reset` | Reset database and re-seed |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |

---

## Database Schema

ShopForge uses a comprehensive Prisma schema with **28 models** covering the full e-commerce domain:

- **User Management** — User, Account, Session, VerificationToken
- **Product Catalog** — Product, ProductVariant, ProductTag, Category, Brand, Inventory, InventoryHistory
- **Shopping** — Cart, CartItem, WishlistItem, RecentlyViewed
- **Orders** — Order, OrderItem, OrderTimeline, Payment
- **Marketing** — Coupon, FlashSale, FlashSaleProduct, Banner, Review, ReviewVote
- **Operations** — Address, Notification, AuditLog, StoreSettings

---

## Security

ShopForge implements multiple security layers:

- **CSRF Protection** — Double-submit cookie pattern for all state-changing requests
- **Rate Limiting** — IP-based rate limiting with stricter limits on auth endpoints
- **Security Headers** — HSTS, CSP, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- **Input Validation** — Zod schemas validate every API input before processing
- **Password Security** — bcryptjs hashing for user passwords
- **CORS** — Configured cross-origin policies for API routes
- **Request Tracing** — Unique request IDs for debugging and audit trails

---

## Code Quality

- **TypeScript Strict Mode** — Full type safety across the codebase
- **ESLint + Prettier** — Consistent code style enforced automatically
- **Husky + lint-staged** — Pre-commit hooks prevent uncommitted lint errors
- **Commitlint** — Conventional commit message format enforced
- **Repository Pattern** — Clean separation between data access and business logic
- **DTO Pattern** — Every API input has a validated data transfer object
- **Modular Architecture** — Feature-based modules with clear boundaries

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Author

**Shoaib Mohammed**

- GitHub: [@shoaibMohammedDev](https://github.com/shoaibMohammedDev)
