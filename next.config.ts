import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Production: enforce type checking during build
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable strict mode for catching bugs
  reactStrictMode: true,
  // Allow dev requests from Caddy proxy / preview domain
  allowedDevOrigins: [
    'http://0.0.0.0:3000',
    'http://localhost:3000',
    'https://preview-chat-4ecdb245-14c3-491b-99ff-401500f627ff.space-z.ai',
    'http://0.0.0.0:81',
  ],
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
  // SPA rewrites - serve index page for all client-side routes
  // This ensures direct navigation to /products, /cart, etc. works
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
  // Comprehensive security headers
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' https:; connect-src 'self' https: wss:; frame-ancestors 'self' https://*.space-z.ai;",
        },
      ],
    },
  ],
};

export default nextConfig;
