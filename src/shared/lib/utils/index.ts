/**
 * @file utils.ts
 * @description General-purpose utility functions for ShopForge.
 *   Houses shared helpers that don't belong to any specific domain module.
 *   Currently provides the `cn()` function for composing Tailwind CSS
 *   class names with conflict resolution.
 *
 * Key Responsibilities:
 *   - Merge Tailwind CSS class strings with intelligent conflict resolution
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Compose and merge Tailwind CSS class names.
 *
 * Combines `clsx` (conditional class joining) with `twMerge` (Tailwind
 * conflict resolution) so that later classes override earlier ones. For
 * example, `cn("p-4", "p-6")` resolves to `"p-6"` rather than `"p-4 p-6"`.
 *
 * This is the standard pattern recommended by the shadcn/ui library and
 * should be used everywhere conditional or composed class names are needed.
 *
 * @param inputs - Class values accepted by `clsx`: strings, arrays,
 *                 conditional objects, or falsy values (which are ignored).
 * @returns A single string of deduplicated, conflict-resolved class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
