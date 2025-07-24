import sharp from "sharp";

/**
 * Process avatar image: crop to square and resize to 200x200
 * @param buffer - The image buffer to process
 * @returns Promise<Buffer> - The processed image buffer
 */
export async function processAvatarImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata to determine dimensions
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Could not determine image dimensions");
    }

    const { width, height } = metadata;

    // Calculate square crop dimensions
    const side = Math.min(width, height);

    // Calculate crop position (center crop)
    let left = 0;
    let top = 0;

    if (width > height) {
      // Crop horizontal sides
      left = Math.floor((width - side) / 2);
      top = 0;
    } else if (height > width) {
      // Crop vertical sides
      left = 0;
      top = Math.floor((height - side) / 2);
    }
    // If width === height, no cropping needed (left = 0, top = 0)

    // Process the image: crop to square and resize to 200x200
    const processedBuffer = await image
      .extract({
        left,
        top,
        width: side,
        height: side,
      })
      .resize(200, 200, {
        fit: "cover", // Ensure exact 200x200 dimensions
        position: "center",
      })
      .jpeg({
        quality: 90, // High quality JPEG
        progressive: true,
      })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error("Image processing error:", error);
    throw new Error("Failed to process image");
  }
}

/**
 * Process cover image: crop to square and resize to 300x300
 * @param buffer - The image buffer to process
 * @returns Promise<Buffer> - The processed image buffer
 */
export async function processCoverImage(buffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata to determine dimensions
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Could not determine image dimensions");
    }

    const { width, height } = metadata;

    // Calculate square crop dimensions (use the smaller dimension)
    const side = Math.min(width, height);

    // Calculate crop position (center crop)
    let left = 0;
    let top = 0;

    if (width > height) {
      // Image is landscape - crop from left and right
      left = Math.floor((width - side) / 2);
      top = 0;
    } else if (height > width) {
      // Image is portrait - crop from top and bottom
      left = 0;
      top = Math.floor((height - side) / 2);
    }
    // If width === height, already square (left = 0, top = 0)

    // Process the image: first crop to square, then resize to 300x300
    const processedBuffer = await image
      .extract({
        left,
        top,
        width: side,
        height: side,
      })
      .resize(300, 300) // Simple resize without fit options since we already cropped to square
      .jpeg({
        quality: 95, // Higher quality (95% instead of 80%)
        progressive: true,
      })
      .toBuffer();

    return processedBuffer;
  } catch (error) {
    console.error("Cover image processing error:", error);
    throw new Error("Failed to process cover image");
  }
}

/**
 * Validate image format and basic properties
 * @param buffer - The image buffer to validate
 * @returns Promise<boolean> - Whether the image is valid
 */
export async function validateImageBuffer(buffer: Buffer): Promise<boolean> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Check if it's a valid image format
    const validFormats = ["jpeg", "jpg", "png", "webp"];
    if (!metadata.format || !validFormats.includes(metadata.format)) {
      return false;
    }

    // Check minimum dimensions (should be at least 50x50)
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 50 ||
      metadata.height < 50
    ) {
      return false;
    }

    // Check maximum dimensions (reasonable limit: 5000x5000)
    if (metadata.width > 5000 || metadata.height > 5000) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate cover image buffer with higher size limits
 * @param buffer - The image buffer to validate
 * @returns Promise<boolean> - Whether the image is valid
 */
export async function validateCoverImageBuffer(
  buffer: Buffer,
): Promise<boolean> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Check if it's a valid image format
    const validFormats = ["jpeg", "jpg", "png", "webp"];
    if (!metadata.format || !validFormats.includes(metadata.format)) {
      return false;
    }

    // Check minimum dimensions (should be at least 100x100 for covers)
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < 100 ||
      metadata.height < 100
    ) {
      return false;
    }

    // Check maximum dimensions (higher limit for covers: 8000x8000)
    if (metadata.width > 8000 || metadata.height > 8000) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
