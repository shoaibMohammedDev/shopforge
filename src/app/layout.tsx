/**
 * @file layout.tsx
 * @description Root layout component for the ShopForge e-commerce application.
 * This is the top-level layout that wraps every page in the application. It is
 * responsible for configuring global fonts, SEO metadata, structured data (JSON-LD),
 * and shared UI providers (theme, auth, cart state, etc.).
 *
 * Key Responsibilities:
 * - Registers Geist Sans & Geist Mono as CSS custom-property fonts via next/font
 * - Exports comprehensive Next.js Metadata for SEO (Open Graph, Twitter, robots, etc.)
 * - Injects Organization structured-data schema for search engine rich results
 * - Wraps the entire app in the <Providers> component tree (theme, zustand, etc.)
 * - Renders the global <Toaster> for toast notifications
 */

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/layout/providers";
import { generateOrganizationSchema } from "@/lib/seo/structured-data";

/**
 * Geist Sans — the primary sans-serif typeface used across the entire UI.
 * Exposed as the CSS custom property `--font-geist-sans` so Tailwind can
 * reference it via `font-sans`.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Geist Mono — the monospace typeface used for code blocks, preformatted text,
 * and any context where a fixed-width font is required. Exposed as
 * `--font-geist-mono`.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The canonical base URL of the application.
 * Falls back to `https://shopforge.dev` when the environment variable is not set,
 * ensuring metadata generation never produces broken URLs in development.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://shopforge.dev";

/**
 * Application-wide metadata exported for Next.js SEO.
 *
 * - `metadataBase` — resolves relative Open Graph / canonical URLs against this origin
 * - `title` — default title plus a `%s` template so sub-pages can prepend their own title
 * - `openGraph` — rich sharing previews for Facebook, LinkedIn, etc.
 * - `twitter` — large-image card for Twitter/X previews
 * - `robots` — explicitly allows full indexing and rich snippet previews
 * - `verification` — placeholder for Google Search Console verification code
 *
 * @see https://nextjs.org/docs/app/api-reference/functions/generate-metadata
 */
export const metadata: Metadata = {
  /** Base origin used to resolve relative OG image and canonical URLs */
  metadataBase: new URL(APP_URL),
  title: {
    /** Fallback title when no page-specific title is provided */
    default: "ShopForge - Premium E-Commerce Platform",
    /** Template that wraps page-specific titles, e.g. "Cart | ShopForge" */
    template: "%s | ShopForge",
  },
  description:
    "Discover amazing products at unbeatable prices. Shop electronics, fashion, home goods, and more on ShopForge.",
  /** Search keywords targeting major e-commerce verticals */
  keywords: [
    "ShopForge",
    "e-commerce",
    "online shopping",
    "electronics",
    "fashion",
    "home goods",
    "deals",
    "discount",
  ],
  authors: [{ name: "ShopForge Team" }],
  creator: "ShopForge",
  publisher: "ShopForge",
  /** Disable automatic detection of email, address, and phone to avoid unwanted linking on mobile */
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    /** Standard favicon served as SVG for crisp rendering at any size */
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    /** Apple touch icon used when the site is added to iOS home screen */
    apple: "/logo.svg",
  },
  /** Open Graph metadata for rich previews on social platforms (Facebook, LinkedIn, etc.) */
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "ShopForge",
    title: "ShopForge - Premium E-Commerce Platform",
    description: "Discover amazing products at unbeatable prices.",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        /** 1200×630 is the recommended OG image aspect ratio for maximum compatibility */
        width: 1200,
        height: 630,
        alt: "ShopForge - Premium E-Commerce Platform",
      },
    ],
  },
  /** Twitter Card metadata — large-image summary provides the most visual impact */
  twitter: {
    card: "summary_large_image",
    title: "ShopForge - Premium E-Commerce Platform",
    description: "Discover amazing products at unbeatable prices.",
    images: [`${APP_URL}/og-image.png`],
  },
  /** Search engine crawling directives — fully open to maximize discoverability */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      /** Allow unlimited video/image previews and snippet length in search results */
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  /** Canonical URL to prevent duplicate-content issues across domains */
  alternates: {
    canonical: APP_URL,
  },
  /** Placeholder for Google Search Console domain verification */
  verification: {
    google: "your-google-verification-code",
  },
};

/**
 * RootLayout — the outermost layout component rendered by Next.js for every route.
 *
 * It constructs the <html> and <body> elements, applies the Geist font CSS variables,
 * injects Organization structured-data for SEO, and wraps children in the shared
 * provider tree.
 *
 * @param props - The layout props
 * @param props.children - The nested page or layout content to render
 * @returns The full HTML document structure for the current route
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /** Generate JSON-LD Organization schema for search engine rich results */
  const organizationSchema = generateOrganizationSchema();

  return (
    /** suppressHydrationWarning prevents React hydration mismatch warnings
     *  caused by next-themes adding a `class` attribute to <html> on the client */
    <html lang="en" suppressHydrationWarning>
      <head>
        {/** Inject structured-data as a JSON-LD script tag. Search engines parse
         *  this to display rich results (organization name, logo, social profiles). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      {/**
       * suppressHydrationWarning prevents React hydration mismatch warnings caused by
       * browser extensions (e.g. Czech keyboard, accessibility tools, password managers)
       * that inject attributes like `cz-shortcut-listen` or `data-new-gr-c-s-check`
       * onto the <body> element before React hydrates. Without this flag, React detects
       * a diff between the server-rendered HTML and the client DOM and logs a warning.
       * This is safe because these injected attributes are non-functional for the app.
       */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        {/** Providers wraps the app in theme, auth, cart, and other context providers */}
        <Providers>
          {children}
        </Providers>
        {/** Global toast notification renderer — listens to the toast store and displays messages */}
        <Toaster />
      </body>
    </html>
  );
}
