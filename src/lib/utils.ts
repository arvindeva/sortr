import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
