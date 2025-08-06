import { useState, useEffect, useCallback } from "react";

export interface PreloadProgress {
  loaded: number;
  total: number;
  failed: number;
  isComplete: boolean;
  failedUrls: string[];
}

interface UseImagePreloaderReturn {
  progress: PreloadProgress;
  preloadImages: (imageUrls: string[]) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for preloading images using native Image constructor
 * Optimized for Cloudflare R2 + Sharp processed images
 */
export function useImagePreloader(): UseImagePreloaderReturn {
  const [progress, setProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: 0,
    failed: 0,
    isComplete: false,
    failedUrls: [],
  });

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Skip empty or invalid URLs
      if (!src || typeof src !== "string") {
        reject(new Error("Invalid image URL"));
        return;
      }

      const img = new Image();

      img.onload = () => {
        setProgress((prev) => ({
          ...prev,
          loaded: prev.loaded + 1,
          isComplete: prev.loaded + 1 >= prev.total,
        }));
        resolve();
      };

      img.onerror = () => {
        setProgress((prev) => ({
          ...prev,
          failed: prev.failed + 1,
          failedUrls: [...prev.failedUrls, src],
          isComplete: prev.loaded + prev.failed + 1 >= prev.total,
        }));
        reject(new Error(`Failed to load image: ${src}`));
      };

      // Try with crossOrigin first, fallback without if CORS fails
      const tryLoad = (withCors: boolean) => {
        if (withCors) {
          img.crossOrigin = "anonymous";
        }
        img.src = src;
      };

      // Handle CORS failures by retrying without crossOrigin
      const originalOnError = img.onerror;
      img.onerror = () => {
        // If this was a CORS attempt, try again without CORS
        if (img.crossOrigin === "anonymous") {
          img.crossOrigin = "";
          img.onerror = originalOnError;
          img.src = src;
          return;
        }
        // If non-CORS attempt failed, call original error handler
        originalOnError?.call(img);
      };

      tryLoad(true);
    });
  }, []);

  const preloadImages = useCallback(
    async (imageUrls: string[]): Promise<void> => {
      // Filter out empty/invalid URLs
      const validUrls = imageUrls.filter(
        (url) => url && typeof url === "string",
      );

      if (validUrls.length === 0) {
        setProgress({
          loaded: 0,
          total: 0,
          failed: 0,
          isComplete: true,
          failedUrls: [],
        });
        return;
      }

      // Reset progress
      setProgress({
        loaded: 0,
        total: validUrls.length,
        failed: 0,
        isComplete: false,
        failedUrls: [],
      });

      // Use Promise.allSettled to handle failures gracefully
      const results = await Promise.allSettled(
        validUrls.map((url) => preloadImage(url)),
      );

      // Final progress update (should already be complete from individual updates)
      const successful = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failed = results.filter(
        (result) => result.status === "rejected",
      ).length;
      const failedUrls = results
        .map((result, index) =>
          result.status === "rejected" ? validUrls[index] : null,
        )
        .filter(Boolean) as string[];

      setProgress((prev) => ({
        loaded: successful,
        total: validUrls.length,
        failed: failed,
        isComplete: true,
        failedUrls,
      }));
    },
    [preloadImage],
  );

  const reset = useCallback(() => {
    setProgress({
      loaded: 0,
      total: 0,
      failed: 0,
      isComplete: false,
      failedUrls: [],
    });
  }, []);

  return {
    progress,
    preloadImages,
    reset,
  };
}
