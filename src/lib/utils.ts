import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique 6-character alphanumeric ID
 * @returns A 6-character unique identifier (e.g., "a1b2c3")
 */
export function generateUniqueId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Add unique suffix to file name for correlation tracking
 * @param fileName Original file name (e.g., "image.png")
 * @param uniqueId Unique identifier to add
 * @returns Modified file name (e.g., "image-a1b2c3.png")
 */
export function addSuffixToFileName(
  fileName: string,
  uniqueId: string,
): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    // No extension
    return `${fileName}-${uniqueId}`;
  }

  const nameWithoutExt = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  return `${nameWithoutExt}-${uniqueId}${extension}`;
}

/**
 * Extract unique ID from a file name with suffix
 * @param fileName File name with suffix (e.g., "image-a1b2c3.png")
 * @returns The unique ID (e.g., "a1b2c3") or null if not found
 */
export function extractIdFromFileName(fileName: string): string | null {
  // Match pattern: -[6 alphanumeric chars] before file extension or end of string
  const match = fileName.match(/-([a-z0-9]{6})(?:\.[^.]+)?$/);
  return match ? match[1] : null;
}

/**
 * Remove unique ID suffix from file name to get original name
 * @param fileName File name with suffix (e.g., "image-a1b2c3.png")
 * @returns Original file name (e.g., "image.png")
 */
export function removeIdFromFileName(fileName: string): string {
  // Remove pattern: -[6 alphanumeric chars] before file extension
  return fileName.replace(/-[a-z0-9]{6}(?=\.[^.]+$|$)/, "");
}

/**
 * Generate a URL-friendly slug from a string
 * @param text The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // Replace spaces with hyphens
      .replace(/\s+/g, "-")
      // Remove special characters except hyphens
      .replace(/[^a-z0-9-]/g, "")
      // Remove multiple consecutive hyphens
      .replace(/-+/g, "-")
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, "")
  );
}

/**
 * Generate a unique slug for a group within a sorter
 * @param groupName The name of the group
 * @param existingSlugs Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueSlug(
  groupName: string,
  existingSlugs: string[],
): string {
  const baseSlug = slugify(groupName);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Generate a random alphanumeric string
 * @param length The length of the string to generate
 * @returns A random alphanumeric string
 */
function generateRandomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a sorter slug with 50-character limit and 5-character suffix
 * @param title The sorter title
 * @returns A URL-friendly slug with format: {title-slug-50-chars}-{5-char-suffix}
 */
export function generateSorterSlug(title: string): string {
  // Create base slug and limit to 50 characters
  let baseSlug = slugify(title);
  if (baseSlug.length > 50) {
    baseSlug = baseSlug.substring(0, 50);
    // Remove trailing hyphen if we cut off mid-word
    baseSlug = baseSlug.replace(/-$/, "");
  }

  // Generate 5-character random suffix
  const suffix = generateRandomString(5);

  return `${baseSlug}-${suffix}`;
}

/**
 * Generate a sorter item slug with random suffix for uniqueness
 * @param itemName The item name (usually from filename without extension)
 * @param groupSlug Optional group slug for grouped sorters
 * @returns A unique slug for the item
 */
export function generateSorterItemSlug(
  itemName: string,
  groupSlug?: string,
): string {
  // Create base slug from item name, limit to 40 characters to leave room for group prefix and suffix
  let baseSlug = slugify(itemName);
  if (baseSlug.length > 40) {
    baseSlug = baseSlug.substring(0, 40);
    // Remove trailing hyphen if we cut off mid-word
    baseSlug = baseSlug.replace(/-$/, "");
  }

  // Generate 6-character random suffix for uniqueness
  const suffix = generateRandomString(6);

  // Combine with group slug if provided
  if (groupSlug) {
    return `${groupSlug}--${baseSlug}-${suffix}`;
  }

  return `${baseSlug}-${suffix}`;
}

/**
 * Generate a tag slug from tag name
 * @param tagName The tag name to convert to a slug
 * @returns A URL-friendly tag slug
 */
export function generateTagSlug(tagName: string): string {
  return slugify(tagName);
}

/**
 * Generate a unique tag slug within a sorter
 * @param tagName The tag name to convert to a slug
 * @param existingSlugs Array of existing tag slugs to check against
 * @returns A unique tag slug
 */
export function generateUniqueTagSlug(
  tagName: string,
  existingSlugs: string[],
): string {
  const baseSlug = generateTagSlug(tagName);

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;

  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }

  return uniqueSlug;
}

/**
 * Validate tag name for creation
 * @param tagName The tag name to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateTagName(tagName: string): {
  isValid: boolean;
  error?: string;
} {
  // Trim whitespace
  const trimmed = tagName.trim();

  // Check if empty
  if (!trimmed) {
    return { isValid: false, error: "Tag cannot be empty" };
  }

  // Check length (reasonable max)
  if (trimmed.length > 100) {
    return { isValid: false, error: "Tag name too long (max 100 characters)" };
  }

  // Only restrict control characters that could cause database/display issues
  if (/[\x00-\x1f\x7f]/.test(trimmed)) {
    return {
      isValid: false,
      error: "Tag contains invalid control characters",
    };
  }

  return { isValid: true };
}

/**
 * Utility function to chunk an array into smaller batches
 * @param array The array to chunk
 * @param size The size of each chunk
 * @returns Array of chunks
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
