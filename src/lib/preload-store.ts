/**
 * Global store for tracking preloaded images
 * This prevents React from showing fallbacks for images we know are already cached
 */

// Global Set to track successfully preloaded image URLs
const preloadedImages = new Set<string>();

/**
 * Mark an image as preloaded
 */
export function markImageAsPreloaded(url: string): void {
  if (url && typeof url === 'string') {
    preloadedImages.add(url);
  }
}

/**
 * Check if an image has been preloaded
 */
export function isImagePreloaded(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return preloadedImages.has(url);
}

/**
 * Clear all preloaded image tracking (useful for cleanup)
 */
export function clearPreloadedImages(): void {
  preloadedImages.clear();
}

/**
 * Get all preloaded image URLs (for debugging)
 */
export function getPreloadedImages(): string[] {
  return Array.from(preloadedImages);
}