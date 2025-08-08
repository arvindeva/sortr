import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  generateSorterItemSizes,
  isCompressibleImage,
} from "@/lib/image-compression";
import { chunkArray } from "@/lib/utils";
import type {
  UploadTokenRequest,
  UploadTokenResponse,
  UploadProgress,
  UploadedFile,
} from "@/types/upload";

interface DirectUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (
    uploadedFiles: UploadedFile[],
    abortController: AbortController | null,
  ) => void;
  onError?: (error: string) => void;
  fileType?: "cover" | "item" | "group-cover"; // Single file type for all files
  getFileType?: (file: File, index: number) => "cover" | "item" | "group-cover"; // Per-file type function
}

interface DirectUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  sessionId: string | null;
  uploadedFiles: UploadedFile[];
  abortController: AbortController | null;
}

// Configuration for upload timeouts and retries
const UPLOAD_CONFIG = {
  CONNECTION_TIMEOUT: 30 * 1000, // 30 seconds to establish connection
  UPLOAD_TIMEOUT: 5 * 60 * 1000, // 5 minutes for file upload to complete
  PROGRESS_TIMEOUT: 30 * 1000, // 30 seconds of no progress indicates stuck upload
  MAX_RETRIES: 3, // Increased from 2 for better resilience
  BASE_DELAY: 500, // Increased base delay
  MAX_DELAY: 10000, // Cap maximum delay
} as const;

// Helper function to create a timeout controller that combines with abort controller
function createTimeoutController(
  abortController: AbortController,
  timeoutMs: number,
  timeoutMessage: string,
): AbortController {
  const timeoutController = new AbortController();
  
  // Forward abort signal from parent controller
  if (abortController.signal.aborted) {
    timeoutController.abort();
  } else {
    abortController.signal.addEventListener('abort', () => {
      timeoutController.abort();
    });
  }

  // Add timeout
  const timeoutId = setTimeout(() => {
    const timeoutError = new Error(timeoutMessage);
    timeoutError.name = 'TimeoutError';
    timeoutController.abort(timeoutError);
  }, timeoutMs);

  // Clean up timeout if operation completes
  timeoutController.signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
  });

  return timeoutController;
}

// Helper function to add jittered exponential backoff
function calculateBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const clampedDelay = Math.min(exponentialDelay, maxDelay);
  // Add jitter: ±25% of calculated delay
  const jitter = clampedDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.max(100, clampedDelay + jitter); // Minimum 100ms delay
}

// Helper function to upload a single file with enhanced timeouts and retries
async function uploadWithRetry(
  uploadUrl: string,
  file: File,
  fileName: string,
  size: string,
  abortController: AbortController,
  maxRetries: number = UPLOAD_CONFIG.MAX_RETRIES,
  baseDelay: number = UPLOAD_CONFIG.BASE_DELAY,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Create timeout controller for this specific upload attempt
    const timeoutController = createTimeoutController(
      abortController,
      UPLOAD_CONFIG.UPLOAD_TIMEOUT,
      `Upload timeout: ${fileName} (${size}) took longer than ${UPLOAD_CONFIG.UPLOAD_TIMEOUT / 1000}s`
    );

    try {
      // Only log on retry attempts, not first attempt
      if (attempt > 1) {
        console.log(
          `Retrying ${fileName} (${size}) - Attempt ${attempt}/${maxRetries}`,
        );
      }

      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
        signal: timeoutController.signal,
      });

      if (response.ok) {
        return response;
      }

      // If it's a 5xx error (server error), retry. For 4xx (client error), don't retry
      if (response.status >= 500) {
        const errorText = await response.text();
        lastError = new Error(`Server error ${response.status}: ${errorText}`);

        if (attempt < maxRetries) {
          const delay = calculateBackoffDelay(attempt, baseDelay, UPLOAD_CONFIG.MAX_DELAY);
          console.log(`Server error, waiting ${Math.round(delay)}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      } else {
        // 4xx error - don't retry, but provide better error messages
        const errorText = await response.text();
        let errorMessage = `Client error ${response.status}: ${errorText}`;
        
        if (response.status === 413) {
          errorMessage = `File too large: ${fileName} exceeds server limits`;
        } else if (response.status === 415) {
          errorMessage = `Unsupported file type: ${fileName}`;
        } else if (response.status === 403) {
          errorMessage = `Access denied: Check your authentication`;
        } else if (response.status === 404) {
          errorMessage = `Upload endpoint not found - please try again`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          // Check if this was a timeout or user cancellation
          if (timeoutController.signal.reason instanceof Error) {
            // This was a timeout
            lastError = timeoutController.signal.reason;
          } else {
            // This was user cancellation
            throw error;
          }
        } else if (error.name === "TimeoutError") {
          lastError = error;
        } else if (error.message.includes("fetch")) {
          // Network error - provide better message
          lastError = new Error(`Network error uploading ${fileName}: ${error.message}`);
        } else {
          lastError = error;
        }
      } else {
        lastError = new Error(`Unknown error uploading ${fileName}: ${String(error)}`);
      }

      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt, baseDelay, UPLOAD_CONFIG.MAX_DELAY);
        console.log(`Upload error, waiting ${Math.round(delay)}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  throw lastError || new Error(`Upload failed after ${maxRetries} retries: ${fileName}`);
}

// Helper function to add delay between batches
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Network availability monitor
class NetworkMonitor {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.handleOnline = this.handleOnline.bind(this);
    this.handleOffline = this.handleOffline.bind(this);
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline(): void {
    this.isOnline = true;
    console.log('Network connection restored');
    this.notifyListeners();
  }

  private handleOffline(): void {
    this.isOnline = false;
    console.warn('Network connection lost');
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  public addListener(listener: (isOnline: boolean) => void): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: (isOnline: boolean) => void): void {
    this.listeners.delete(listener);
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public cleanup(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }

  // Test network connectivity with a lightweight request
  public async testConnectivity(): Promise<boolean> {
    try {
      // Use a small HEAD request to test connectivity
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Progress monitoring watchdog to detect stuck uploads
class ProgressWatchdog {
  private lastProgressTime: number = Date.now();
  private lastOverallProgress: number = 0;
  private timeoutId: number | null = null;
  private abortController: AbortController;

  constructor(abortController: AbortController) {
    this.abortController = abortController;
  }

  // Update progress and reset the watchdog timer
  updateProgress(overallProgress: number): void {
    const now = Date.now();
    
    // Only reset timer if there's actual progress
    if (overallProgress > this.lastOverallProgress) {
      this.lastProgressTime = now;
      this.lastOverallProgress = overallProgress;
      this.resetWatchdog();
    }
  }

  // Start the watchdog monitoring
  start(): void {
    this.resetWatchdog();
  }

  // Stop the watchdog
  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private resetWatchdog(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      if (!this.abortController.signal.aborted) {
        const stuckError = new Error(
          `Upload appears to be stuck - no progress for ${UPLOAD_CONFIG.PROGRESS_TIMEOUT / 1000} seconds`
        );
        stuckError.name = 'ProgressTimeoutError';
        console.warn('Progress watchdog triggered - upload may be stuck');
        // Don't abort automatically, just log the warning for now
        // In the future, this could trigger a retry or user notification
      }
    }, UPLOAD_CONFIG.PROGRESS_TIMEOUT);
  }
}

export function useDirectUpload(options: DirectUploadOptions = {}) {
  const { data: session } = useSession();
  const [state, setState] = useState<DirectUploadState>({
    isUploading: false,
    progress: null,
    error: null,
    sessionId: null,
    uploadedFiles: [],
    abortController: null,
  });

  const updateProgress = useCallback(
    (progress: UploadProgress, watchdog?: ProgressWatchdog) => {
      setState((prev) => ({ ...prev, progress }));
      options.onProgress?.(progress);
      
      // Update watchdog if provided
      if (watchdog && typeof progress.overallProgress === 'number') {
        watchdog.updateProgress(progress.overallProgress);
      }
    },
    [options.onProgress],
  );

  const setError = useCallback(
    (error: string) => {
      setState((prev) => ({
        ...prev,
        error,
        isUploading: false,
        progress: null,
      }));
      options.onError?.(error);
    },
    [options.onError],
  );

  const uploadFiles = useCallback(
    async (files: File[], originalFiles?: File[]) => {
      // If originalFiles not provided, use files for backward compatibility
      const displayFiles = originalFiles || files;
      if (!session?.user) {
        setError("You must be logged in to upload files");
        return;
      }

      if (files.length === 0) {
        setError("No files selected");
        return;
      }

      const abortController = new AbortController();
      
      // Create progress watchdog to monitor for stuck uploads
      const progressWatchdog = new ProgressWatchdog(abortController);
      
      // Create network monitor to detect connectivity issues
      const networkMonitor = new NetworkMonitor();
      
      // Set up network status monitoring
      const networkStatusHandler = (isOnline: boolean) => {
        if (!isOnline) {
          console.warn('Network connectivity lost during upload');
          // Update progress to show network issue
          updateProgress({
            phase: "uploading-files",
            files: displayFiles.map((displayFile, index) => ({
              name: displayFile.name,
              processedName: files[index]?.name,
              progress: 0,
              status: "pending",
            })),
            overallProgress: 0,
            statusMessage: "Network connection lost - upload paused...",
            determinate: false,
          }, progressWatchdog);
        } else {
          console.log('Network connectivity restored');
        }
      };
      
      networkMonitor.addListener(networkStatusHandler);
      
      // Check initial connectivity
      if (!networkMonitor.getIsOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      setState((prev) => ({
        ...prev,
        isUploading: true,
        error: null,
        abortController,
        progress: {
          phase: "requesting-tokens",
          files: displayFiles.map((displayFile, index) => ({
            name: displayFile.name,
            processedName: files[index]?.name,
            progress: 0,
            status: "pending",
          })),
          overallProgress: 0,
          statusMessage: "Preparing upload...",
          determinate: false,
        },
      }));

      try {
        // Start progress monitoring
        progressWatchdog.start();

        // Phase 1: Process images and generate multiple sizes
        updateProgress({
          phase: "requesting-tokens",
          files: displayFiles.map((displayFile, index) => ({
            name: displayFile.name,
            processedName: files[index]?.name,
            progress: 0,
            status: "pending",
          })),
          overallProgress: 0,
          statusMessage: "Processing images...",
          determinate: false,
        }, progressWatchdog);

        // Process images to generate multiple sizes
        const processedFiles: {
          originalFile: File;
          thumbnail?: File;
          full?: File;
        }[] = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Update progress for this file being processed
          updateProgress({
            phase: "requesting-tokens",
            files: displayFiles.map((displayFile, idx) => ({
              name: displayFile.name,
              processedName: files[idx]?.name,
              progress: idx < i ? 100 : idx === i ? 50 : 0,
              status:
                idx < i ? "complete" : idx === i ? "uploading" : "pending",
            })),
            overallProgress: (i / files.length) * 5, // Use 5% for processing
            statusMessage: `Processing ${displayFiles[i]?.name || file.name}...`,
            determinate: false,
          });

          if (isCompressibleImage(file)) {
            try {
              // Generate both thumbnail and full size for item images
              const { thumbnail, full } = await generateSorterItemSizes(file);
              processedFiles.push({
                originalFile: file,
                thumbnail: thumbnail.file,
                full: full.file,
              });
            } catch (error) {
              console.error(`Failed to process ${file.name}:`, error);
              // Fallback: use original file
              processedFiles.push({
                originalFile: file,
                full: file,
              });
            }
          } else {
            // Non-image files (shouldn't happen, but handle gracefully)
            processedFiles.push({
              originalFile: file,
              full: file,
            });
          }
        }

        // Phase 2: Request upload tokens
        updateProgress({
          phase: "requesting-tokens",
          files: displayFiles.map((displayFile, index) => ({
            name: displayFile.name,
            processedName: files[index]?.name,
            progress: 100,
            status: "complete",
          })),
          overallProgress: 5,
          statusMessage: "Requesting upload tokens...",
          determinate: false,
        });

        // Create file infos for token request with explicit file types from UI context
        const fileInfos = files.map((file, index) => {
          // Use per-file type function if provided, otherwise single file type, defaulting to "item"
          const fileType =
            options.getFileType?.(file, index) || options.fileType || "item";

          return {
            name: file.name,
            size: file.size,
            type: file.type,
            fileType,
          };
        });

        console.log("Requesting upload tokens for files:", fileInfos);

        // Create timeout for token request (should be quick)
        const tokenTimeoutController = createTimeoutController(
          abortController,
          UPLOAD_CONFIG.CONNECTION_TIMEOUT,
          `Token request timeout: took longer than ${UPLOAD_CONFIG.CONNECTION_TIMEOUT / 1000}s`
        );

        const tokenResponse = await fetch("/api/upload-tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: fileInfos,
            type: "sorter-creation",
          } as UploadTokenRequest),
          signal: tokenTimeoutController.signal,
        });

        if (!tokenResponse.ok) {
          let errorMessage = "Failed to get upload tokens";
          try {
            const error = await tokenResponse.json();
            errorMessage = error.error || errorMessage;
            console.error("Upload token request failed:", error);
          } catch (parseError) {
            console.error("Failed to parse error response:", parseError);
            errorMessage = `Server error (${tokenResponse.status}): ${tokenResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const tokenData: UploadTokenResponse = await tokenResponse.json();

        setState((prev) => ({ ...prev, sessionId: tokenData.sessionId }));

        // Phase 3: Upload files to R2
        updateProgress({
          phase: "uploading-files",
          files: displayFiles.map((displayFile, index) => ({
            name: displayFile.name,
            processedName: files[index]?.name,
            progress: 0,
            status: "pending",
          })),
          overallProgress: 10,
          statusMessage: "Uploading files to R2...",
          determinate: true,
        });

        const uploadResults: UploadedFile[] = [];

        // Prepare upload tasks for parallel processing
        interface UploadTask {
          originalFile: File;
          processedFile: { originalFile: File; thumbnail?: File; full?: File };
          uploadUrls: Array<{
            uploadUrl: string;
            key: string;
            fileType: string;
            originalName: string;
            size?: string;
          }>;
          fileIndex: number;
        }

        const uploadTasks: UploadTask[] = [];
        let urlIndex = 0;

        // Prepare all upload tasks first
        for (let i = 0; i < files.length; i++) {
          const originalFile = files[i];
          const processedFile = processedFiles[i];

          // Determine how many URLs this file should have based on explicit type
          const fileType =
            options.getFileType?.(originalFile, i) ||
            options.fileType ||
            "item";
          const expectedUrlCount = fileType === "item" ? 2 : 1;

          // Get exactly the URLs for this file
          const uploadUrls = tokenData.uploadUrls.slice(
            urlIndex,
            urlIndex + expectedUrlCount,
          );
          urlIndex += expectedUrlCount;

          // Validate that we have the expected number of URLs
          if (uploadUrls.length !== expectedUrlCount) {
            throw new Error(
              `Expected ${expectedUrlCount} upload URLs for ${originalFile.name}, but got ${uploadUrls.length}`,
            );
          }

          uploadTasks.push({
            originalFile,
            processedFile,
            uploadUrls,
            fileIndex: i,
          });
        }

        // Process uploads in parallel batches
        // Conservative concurrency for stability
        const CONCURRENT_UPLOADS = 5;
        const uploadBatches = chunkArray(uploadTasks, CONCURRENT_UPLOADS);
        let completedTasks = 0;
        const completedFileIndices = new Set<number>(); // Track completed files by index, not name

        console.log(
          `Uploading ${uploadTasks.length} files in ${uploadBatches.length} batches of ${CONCURRENT_UPLOADS}`,
        );

        for (
          let batchIndex = 0;
          batchIndex < uploadBatches.length;
          batchIndex++
        ) {
          const batch = uploadBatches[batchIndex];

          console.log(
            `Processing upload batch ${batchIndex + 1}/${uploadBatches.length} (${batch.length} files)`,
          );

          // Create upload promises for this batch
          const batchPromises = batch.map(async (task) => {
            try {
              const taskResults: UploadedFile[] = [];

              // Upload all sizes for this file
              for (const uploadUrl of task.uploadUrls) {
                // Determine which file to upload based on size
                let fileToUpload: File;
                if (
                  uploadUrl.size === "thumbnail" &&
                  task.processedFile.thumbnail
                ) {
                  fileToUpload = task.processedFile.thumbnail;
                } else if (
                  uploadUrl.size === "full" &&
                  task.processedFile.full
                ) {
                  fileToUpload = task.processedFile.full;
                } else {
                  // For single-URL uploads (covers, group covers), use processed full size
                  fileToUpload = task.processedFile.full || task.originalFile;
                }

                // Use retry mechanism for upload
                const uploadResponse = await uploadWithRetry(
                  uploadUrl.uploadUrl,
                  fileToUpload,
                  task.originalFile.name,
                  uploadUrl.size || "single",
                  abortController,
                );

                // Success - no need for verbose logging

                // Track all uploads (thumbnail and full) in results
                const uploadedFile: UploadedFile = {
                  key: uploadUrl.key,
                  type: uploadUrl.fileType as "cover" | "item" | "group-cover",
                  originalName: uploadUrl.originalName,
                  success: true,
                };
                taskResults.push(uploadedFile);
              }

              return {
                success: true,
                task,
                results: taskResults,
                error: null,
              };
            } catch (error) {
              // Handle AbortError specially - don't log it as an error during cancellation
              if (error instanceof Error && error.name === "AbortError") {
                throw error; // Re-throw to stop the upload process
              }

              console.error(
                `Failed to upload ${task.originalFile.name}:`,
                error,
              );
              return {
                success: false,
                task,
                results: [],
                error: error instanceof Error ? error.message : "Unknown error",
              };
            }
          });

          // Wait for all uploads in this batch to complete
          const batchResults = await Promise.allSettled(batchPromises);

          // Process batch results
          for (const result of batchResults) {
            if (result.status === "fulfilled") {
              const taskResult = result.value;

              if (taskResult.success) {
                // Add successful uploads to results
                uploadResults.push(...taskResult.results);
                completedTasks++;

                // Track this file as completed by its index
                completedFileIndices.add(taskResult.task.fileIndex);

                // Update progress for this file
                updateProgress({
                  phase: "uploading-files",
                  files: displayFiles.map((displayFile, idx) => ({
                    name: displayFile.name,
                    processedName: files[idx]?.name,
                    progress: uploadTasks.find((t) => t.fileIndex === idx)
                      ? 100
                      : 0,
                    status: completedFileIndices.has(idx)
                      ? "complete"
                      : "pending",
                  })),
                  overallProgress: 10 + (completedTasks / files.length) * 80,
                  statusMessage: `Uploaded ${displayFiles[taskResult.task.fileIndex]?.name || taskResult.task.originalFile.name}`,
                  determinate: true,
                }, progressWatchdog);
              } else {
                // Handle failed upload
                completedTasks++;

                // Check if this is an abort error
                if (taskResult.error?.includes("AbortError")) {
                  const abortError = new Error("Upload was cancelled");
                  abortError.name = "AbortError";
                  throw abortError;
                }

                updateProgress({
                  phase: "uploading-files",
                  files: displayFiles.map((displayFile, idx) => ({
                    name: displayFile.name,
                    processedName: files[idx]?.name,
                    progress: 0,
                    status: completedFileIndices.has(idx)
                      ? "complete"
                      : taskResult.task.fileIndex === idx
                        ? "failed"
                        : "pending",
                  })),
                  overallProgress: 10 + (completedTasks / files.length) * 80,
                  statusMessage: `Failed to upload ${displayFiles[taskResult.task.fileIndex]?.name || taskResult.task.originalFile.name}`,
                  determinate: true,
                });
              }
            } else {
              // Promise rejected - check if it's an AbortError
              if (
                result.reason instanceof Error &&
                result.reason.name === "AbortError"
              ) {
                const abortError = new Error("Upload was cancelled");
                abortError.name = "AbortError";
                throw abortError;
              }

              console.error(
                "Unexpected batch promise rejection:",
                result.reason,
              );
              completedTasks++;
            }
          }

          // Add minimal delay between batches only for very large uploads
          // Skip delay after the last batch
          if (
            batchIndex < uploadBatches.length - 1 &&
            uploadTasks.length > 150
          ) {
            const batchDelay = 500; // Just 500ms delay for massive batches (150+ files)

            console.log(`Waiting ${batchDelay}ms before next batch...`);
            await delay(batchDelay);
          }
        }

        // Phase 3: Complete
        updateProgress({
          phase: "complete",
          files: displayFiles.map((displayFile, idx) => ({
            name: displayFile.name,
            processedName: files[idx]?.name,
            progress: 100,
            status: completedFileIndices.has(idx) ? "complete" : "failed",
          })),
          overallProgress: 100,
          statusMessage: "Upload complete!",
          determinate: true,
        });

        // Update progress to creating-sorter phase before calling onSuccess
        updateProgress({
          phase: "creating-sorter",
          files: displayFiles.map((displayFile, index) => ({
            name: displayFile.name,
            processedName: files[index]?.name,
            progress: 100,
            status: "complete",
          })),
          overallProgress: 95,
          statusMessage: "Creating sorter...",
          determinate: false,
        });

        setState((prev) => ({
          ...prev,
          uploadedFiles: uploadResults,
        }));

        // Keep isUploading true during sorter creation
        if (options.onSuccess) {
          try {
            await options.onSuccess(uploadResults, abortController);

            // Check if the operation was cancelled during onSuccess
            if (abortController?.signal.aborted) {
              // Operation was cancelled, don't show completion
              return;
            }

            // After sorter creation is complete, show redirecting message
            updateProgress({
              phase: "complete",
              files: displayFiles.map((displayFile, idx) => ({
                name: displayFile.name,
                processedName: files[idx]?.name,
                progress: 100,
                status: "complete",
              })),
              overallProgress: 100,
              statusMessage: "Redirecting to sorter...",
              determinate: false,
            });

            // Only set isUploading to false after successful completion
            setState((prev) => ({
              ...prev,
              isUploading: false,
            }));
          } catch (error) {
            // If onSuccess fails, handle it as an error
            if (error instanceof Error && error.name === "AbortError") {
              // Was cancelled during sorter creation
              return;
            }

            // Re-throw to be caught by the main catch block
            throw error;
          }
        } else {
          // No onSuccess callback, just set isUploading to false
          setState((prev) => ({
            ...prev,
            isUploading: false,
          }));
        }

        // Stop progress monitoring and network monitoring on success
        progressWatchdog.stop();
        networkMonitor.cleanup();
      } catch (error) {
        // Stop progress monitoring and network monitoring on error
        progressWatchdog.stop();
        networkMonitor.cleanup();

        // Handle AbortError specifically
        if (error instanceof Error && error.name === "AbortError") {
          // Upload was cancelled - don't call onError, just exit silently
          return;
        }

        console.error("Upload error:", error);
        setError(error instanceof Error ? error.message : "Upload failed");
      }
    },
    [session, updateProgress, setError, options.onSuccess],
  );

  const cancel = useCallback(() => {
    if (state.abortController) {
      state.abortController.abort();
    }

    setState({
      isUploading: false,
      progress: null,
      error: null,
      sessionId: null,
      uploadedFiles: [],
      abortController: null,
    });
  }, [state.abortController]);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: null,
      error: null,
      sessionId: null,
      uploadedFiles: [],
      abortController: null,
    });
  }, []);

  return {
    ...state,
    uploadFiles,
    cancel,
    reset,
  };
}
