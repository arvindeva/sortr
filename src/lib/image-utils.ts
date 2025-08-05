/**
 * Utility for smart image URL selection based on display context
 */

/**
 * Get the appropriate image URL based on size requirements
 * @param baseUrl - The main image URL (e.g., "https://r2.../item-abc.jpg")
 * @param size - The desired size ('thumbnail' for 64px, 'full' for 300px)
 * @returns The appropriate image URL
 */
export function getImageUrl(
  baseUrl: string | null | undefined,
  size: "thumbnail" | "full",
): string {
  // Handle null/undefined URLs
  if (!baseUrl) {
    return "/placeholder.jpg"; // You can customize this placeholder path
  }

  if (size === "thumbnail") {
    // For backward compatibility: try thumbnail first, but fallback to full size
    // This handles cases where thumbnail versions don't exist (e.g., after edits)
    const thumbnailUrl = baseUrl.replace(/\.([^.]+)$/, "-thumb.jpg");

    // TODO: In the future, we could add logic to check if thumbnail exists
    // For now, return thumbnail URL and let the browser/component handle fallback
    return thumbnailUrl;
  }

  // Full size is the base URL (keep original extension for backward compatibility)
  return baseUrl;
}

/**
 * Check if an image URL has thumbnail support (contains the naming pattern)
 * This is useful for backward compatibility with legacy images
 * @param baseUrl - The image URL to check
 * @returns True if the image likely has thumbnail support
 */
export function hasThumbSupport(baseUrl: string | null | undefined): boolean {
  if (!baseUrl) return false;

  // New images will follow the pattern, legacy images won't have -thumb variants
  // For now, we'll assume all images have thumbnail support and gracefully fallback
  return true;
}

/**
 * Get a fallback URL for when thumbnail is not available
 * @param baseUrl - The main image URL
 * @returns The fallback URL (same as base URL for now)
 */
export function getFallbackUrl(baseUrl: string | null | undefined): string {
  return baseUrl || "/placeholder.jpg";
}

/**
 * Generate srcSet for responsive images (future enhancement)
 * @param baseUrl - The main image URL
 * @returns srcSet string for responsive images
 */
export function generateSrcSet(baseUrl: string | null | undefined): string {
  if (!baseUrl) return "";

  const thumbnailUrl = getImageUrl(baseUrl, "thumbnail");
  const fullUrl = getImageUrl(baseUrl, "full");

  return `${thumbnailUrl} 64w, ${fullUrl} 300w`;
}

/**
 * Get sizes attribute for responsive images
 * @param displaySize - The display context
 * @returns sizes attribute value
 */
export function getSizesAttribute(
  displaySize: "small" | "medium" | "large",
): string {
  switch (displaySize) {
    case "small":
      return "(max-width: 768px) 24px, 40px"; // Mobile: 24px, Desktop: 40px
    case "medium":
      return "(max-width: 768px) 48px, 64px"; // Mobile: 48px, Desktop: 64px
    case "large":
      return "(max-width: 768px) 200px, 300px"; // Mobile: 200px, Desktop: 300px
    default:
      return "64px";
  }
}
