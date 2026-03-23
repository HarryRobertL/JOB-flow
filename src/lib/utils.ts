/**
 * Utility Functions
 * 
 * Shared utility functions for the JobFlow frontend.
 * Includes className merging utility compatible with shadcn UI.
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges class names with Tailwind CSS class conflict resolution.
 * Compatible with shadcn UI patterns.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

