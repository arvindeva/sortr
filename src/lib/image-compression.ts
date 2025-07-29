/**
 * Client-side image compression utility using Canvas API
 */

export interface CompressionOptions {
  quality?: number; // 0.1 to 1.0, default 0.85
  maxWidth?: number; // Max width in pixels
  maxHeight?: number; // Max height in pixels
  format?: "jpeg" | "png" | "webp"; // Output format, default 'jpeg'
  exactSize?: { width: number; height: number }; // Force exact dimensions (crops/stretches)
}

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface MultiSizeResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  suffix: string;
  size: { width: number; height: number };
}

/**
 * Compress an image file using Canvas API
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const {
    quality = 0.85,
    maxWidth = 300,
    maxHeight = 300,
    format = "jpeg",
    exactSize,
  } = options;

  return new Promise((resolve, reject) => {
    // Create image element
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      let sourceX = 0,
        sourceY = 0,
        sourceWidth = width,
        sourceHeight = height;

      if (exactSize) {
        // Force exact dimensions - center crop
        width = exactSize.width;
        height = exactSize.height;

        // Calculate crop area (center crop)
        const scale = Math.max(width / img.width, height / img.height);
        sourceWidth = width / scale;
        sourceHeight = height / scale;
        sourceX = (img.width - sourceWidth) / 2;
        sourceY = (img.height - sourceHeight) / 2;
      } else {
        // Maintain aspect ratio with max dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        width,
        height,
      );

      // Convert to blob with compression
      const mimeType =
        format === "jpeg"
          ? "image/jpeg"
          : format === "png"
            ? "image/png"
            : "image/webp";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas conversion failed"));
            return;
          }

          // Create new file with compressed blob
          const compressedFile = new File(
            [blob],
            file.name.replace(
              /\.[^/.]+$/,
              `.${format === "jpeg" ? "jpg" : format}`,
            ),
            {
              type: mimeType,
              lastModified: Date.now(),
            },
          );

          const originalSize = file.size;
          const compressedSize = compressedFile.size;
          const compressionRatio = compressedSize / originalSize;

          resolve({
            file: compressedFile,
            originalSize,
            compressedSize,
            compressionRatio,
          });
        },
        mimeType,
        quality,
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress multiple images in parallel with progress tracking
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void,
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];
  let completed = 0;

  // Process images in batches to avoid overwhelming the browser
  const batchSize = 3;

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);

    const batchPromises = batch.map(async (file) => {
      try {
        const result = await compressImage(file, options);
        completed++;
        onProgress?.(completed, files.length);
        return result;
      } catch (error) {
        console.error(`Failed to compress ${file.name}:`, error);
        // Return original file if compression fails
        completed++;
        onProgress?.(completed, files.length);
        return {
          file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check if a file is an image that can be compressed
 */
export function isCompressibleImage(file: File): boolean {
  return (
    file.type.startsWith("image/") &&
    ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)
  );
}

/**
 * Generate multiple sizes of an image
 */
export async function generateImageSizes(
  file: File,
  sizes: Array<{ width: number; height: number; suffix: string }>,
  options: Omit<
    CompressionOptions,
    "maxWidth" | "maxHeight" | "exactSize"
  > = {},
): Promise<MultiSizeResult[]> {
  const { quality = 0.85, format = "jpeg" } = options;

  const results: MultiSizeResult[] = [];

  // Process sizes in parallel for better performance
  const sizePromises = sizes.map(async (sizeConfig) => {
    const compressionOptions: CompressionOptions = {
      quality,
      format,
      exactSize: { width: sizeConfig.width, height: sizeConfig.height },
    };

    const result = await compressImage(file, compressionOptions);

    return {
      ...result,
      suffix: sizeConfig.suffix,
      size: { width: sizeConfig.width, height: sizeConfig.height },
    } as MultiSizeResult;
  });

  const resolvedResults = await Promise.all(sizePromises);
  results.push(...resolvedResults);

  return results;
}

/**
 * Generate sorter item images in standard sizes (thumbnail + full)
 */
export async function generateSorterItemSizes(
  file: File,
  options: Omit<
    CompressionOptions,
    "maxWidth" | "maxHeight" | "exactSize"
  > = {},
): Promise<{ thumbnail: MultiSizeResult; full: MultiSizeResult }> {
  const sizes = [
    { width: 64, height: 64, suffix: "thumb" },
    { width: 300, height: 300, suffix: "" }, // No suffix for full size
  ];

  const results = await generateImageSizes(file, sizes, options);

  return {
    thumbnail: results.find((r) => r.suffix === "thumb")!,
    full: results.find((r) => r.suffix === "")!,
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
