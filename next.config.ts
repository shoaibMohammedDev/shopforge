// ============================================================================
// @file next.config.ts
// @description Next.js configuration for the ShopForge e-commerce platform.
//
// Key responsibilities:
// - Standalone output mode for containerized deployment (produces a self-contained
//   server bundle in .next/standalone that doesn't require node_modules at runtime)
// - SPA rewrite rules that map all client-side routes to the root page, enabling
//   the Zustand-based router to handle navigation without file-system routing
// - Security headers applied to all responses (CSP, HSTS, XSS protection, etc.)
// - Image optimization settings for AVIF/WebP and remote AWS S3 patterns
// - Allowed development origins for the Caddy reverse proxy and preview domain
// ============================================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Generate a standalone server build for Docker/container deployment.
  // This produces .next/standalone/ with a minimal server.js and only the
  // required production dependencies, reducing image size significantly.
  output: "standalone",

  // Production: enforce type checking during build.
  // Set to false only in CI pipelines that run tsc separately.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Enable React strict mode for catching common bugs during development
  // (e.g., deprecated lifecycle methods, legacy context API, side effects
  // in constructors). Components render twice in dev to detect issues.
  reactStrictMode: true,

  // Allowed origins for dev server WebSocket connections.
  // Required because the Caddy reverse proxy forwards requests from the
  // preview domain, and the dev server verifies the Origin header.
  allowedDevOrigins: [
    'http://0.0.0.0:3000',
    'http://localhost:3000',
    'https://preview-chat-4ecdb245-14c3-491b-99ff-401500f627ff.space-z.ai',
    'http://0.0.0.0:81',
  ],

  // Image optimization configuration.
  // - formats: Prefer AVIF (better compression) with WebP fallback
  // - remotePatterns: Allow images hosted on AWS S3/CloudFront
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },

  // SPA rewrites - serve the root index page for all client-side routes.
  // Since ShopForge uses a Zustand-based client-side router (see
  // src/stores/router-store.ts), all routes are handled by the same
  // page component. These rewrites ensure that direct navigation to
  // /products, /cart, /account, /admin, etc. returns the app shell
  // instead of a 404, and the router parses the URL to render the
  // correct page component.
  async rewrites() {
    return [
      { source: '/products/:path*', destination: '/' },
      { source: '/cart', destination: '/' },
      { source: '/checkout', destination: '/' },
      { source: '/login', destination: '/' },
      { source: '/register', destination: '/' },
      { source: '/account/:path*', destination: '/' },
      { source: '/admin/:path*', destination: '/' },
    ]
  },

  // Comprehensive security headers applied to all responses.
  // These complement the headers set in src/middleware.ts for API routes.
  // Note: middleware.ts overrides some of these (e.g., CSP) for API-specific
  // policies, but these serve as the baseline for page responses.
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        // Prevent MIME type sniffing — forces browser to respect Content-Type
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        // Prevent clickjacking via iframe embedding
        { key: 'X-Frame-Options', value: 'DENY' },
        // Enable browser XSS filter (legacy but still useful for older browsers)
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        // Only send referrer for same-origin and explicit cross-origin navigations
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        // Force HTTPS for 2 years, include subdomains, and allow preloading
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        // Disable browser access to camera, microphone, and geolocation APIs
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        // Content Security Policy — restricts resource loading to prevent XSS.
        // - script-src: 'unsafe-eval' needed for Next.js dev, 'unsafe-inline' for
        //   inline scripts injected by Next.js framework
        // - style-src: 'unsafe-inline' needed for Tailwind CSS and next-themes
        // - img-src: 'data:' for placeholder SVGs, 'https:' for product images,
        //   'blob:' for dynamic image generation
        // - frame-ancestors: Allow embedding in preview iframe on space-z.ai
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' https:; connect-src 'self' https: wss:; frame-ancestors 'self' https://*.space-z.ai;",
        },
      ],
    },
  ],
};

export default nextConfig;
