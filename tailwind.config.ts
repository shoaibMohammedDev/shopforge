// ============================================================================
// @file tailwind.config.ts
// @description Tailwind CSS configuration for the ShopForge e-commerce platform.
//
// Architecture:
//   CSS variables (globals.css) → Tailwind theme extension → Utility classes
//
// This configuration extends the default Tailwind theme with design tokens
// defined as CSS custom properties in src/app/globals.css. The variables
// follow the shadcn/ui convention where each semantic color (primary, muted,
// destructive, etc.) has a base and a -foreground variant for contrast.
//
// Key design decisions:
// - darkMode: "class" — Uses class-based dark mode toggled by next-themes
//   (adds/removes .dark class on <html>), enabling SSR-safe theme switching
// - Colors reference HSL values via CSS vars for runtime theming without
//   rebuild (e.g., switching between light/dark themes)
// - borderRadius uses a --radius CSS variable so the entire border scale
//   can be adjusted from a single value in globals.css
// - tailwindcss-animate plugin provides animation utilities used by
//   shadcn/ui components (sheet, dialog, toast transitions)
// ============================================================================

import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  // Class-based dark mode strategy.
  // next-themes adds/removes the .dark class on <html>, which triggers
  // the CSS variable overrides defined in globals.css under .dark {}
  darkMode: "class",

  // Content paths for Tailwind's JIT compiler to scan for class usage.
  // Includes pages, components, and app directories to ensure all
  // dynamically-constructed class names are included in the output CSS.
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        // Semantic color tokens sourced from CSS variables.
        // Each color reads an HSL value from globals.css, enabling
        // runtime theme switching without CSS rebuild.

        // Base surface and text colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        // Card container and its text — slightly elevated surface
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Popover/dropdown surface and its text
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        // Primary action color — buttons, links, active states
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },

        // Secondary action color — less prominent buttons, badges
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },

        // Muted/de-emphasized content — disabled states, placeholders
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        // Accent color — highlighted items, hover states, selections
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        // Destructive/danger color — error messages, delete actions
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },

        // Structural colors — borders, inputs, focus rings
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Chart palette — 5 distinct hues for Recharts data visualization.
        // Each color maps to a CSS variable that differs between light and
        // dark themes for optimal contrast on both backgrounds.
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },

      // Border radius scale derived from the --radius CSS variable.
      // This allows changing the entire border radius system by adjusting
      // a single value in globals.css (--radius: 0.625rem by default).
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },

  // Animation plugin required by shadcn/ui components.
  // Provides enter/exit animation utilities for Sheet, Dialog, Toast, etc.
  plugins: [tailwindcssAnimate],
};

export default config;
