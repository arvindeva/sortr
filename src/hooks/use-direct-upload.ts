import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { generateSorterItemSizes, isCompressibleImage } from "@/lib/image-compression";
import { chunkArray } from "@/lib/utils";
import type {
  UploadTokenRequest,
  UploadTokenResponse,
  UploadProgress,
  UploadedFile,
} from "@/types/upload";

interface DirectUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (uploadedFiles: UploadedFile[], abortController: AbortController | null) => void;
  onError?: (error: string) => void;
}

interface DirectUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  sessionId: string | null;
  uploadedFiles: UploadedFile[];
  abortController: AbortController | null;
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
    (progress: UploadProgress) => {
      setState((prev) => ({ ...prev, progress }));
      options.onProgress?.(progress);
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
        });

        // Process images to generate multiple sizes
        const processedFiles: { originalFile: File; thumbnail?: File; full?: File }[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Update progress for this file being processed
          updateProgress({
            phase: "requesting-tokens",
            files: displayFiles.map((displayFile, idx) => ({
              name: displayFile.name,
              processedName: files[idx]?.name,
              progress: idx < i ? 100 : idx === i ? 50 : 0,
              status: idx < i ? "complete" : idx === i ? "uploading" : "pending",
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

        // Create file infos for token request (still based on original files)
        const fileInfos = files.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        }));

        const tokenResponse = await fetch("/api/upload-tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            files: fileInfos,
            type: "sorter-creation",
          } as UploadTokenRequest),
          signal: abortController.signal,
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error || "Failed to get upload tokens");
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
          
          // Determine how many URLs this file should have based on type
          // Items get 2 URLs (thumbnail + full), covers/group-covers get 1 URL
          const isItemFile = !originalFile.name.toLowerCase().startsWith('cover-') && 
                           !originalFile.name.toLowerCase().startsWith('group-cover-');
          const expectedUrlCount = isItemFile ? 2 : 1;
          
          // Get exactly the URLs for this file
          const uploadUrls = tokenData.uploadUrls.slice(urlIndex, urlIndex + expectedUrlCount);
          urlIndex += expectedUrlCount;
          
          // Validate that we have the expected number of URLs
          if (uploadUrls.length !== expectedUrlCount) {
            throw new Error(
              `Expected ${expectedUrlCount} upload URLs for ${originalFile.name}, but got ${uploadUrls.length}`
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
        const CONCURRENT_UPLOADS = 6; // Conservative concurrency for stability
        const uploadBatches = chunkArray(uploadTasks, CONCURRENT_UPLOADS);
        let completedTasks = 0;

        for (let batchIndex = 0; batchIndex < uploadBatches.length; batchIndex++) {
          const batch = uploadBatches[batchIndex];
          
          console.log(`Processing upload batch ${batchIndex + 1}/${uploadBatches.length} (${batch.length} files)`);

          // Create upload promises for this batch
          const batchPromises = batch.map(async (task) => {
            try {
              const taskResults: UploadedFile[] = [];
              
              // Upload all sizes for this file
              for (const uploadUrl of task.uploadUrls) {
                // Determine which file to upload based on size
                let fileToUpload: File;
                if (uploadUrl.size === 'thumbnail' && task.processedFile.thumbnail) {
                  fileToUpload = task.processedFile.thumbnail;
                } else if (uploadUrl.size === 'full' && task.processedFile.full) {
                  fileToUpload = task.processedFile.full;
                } else {
                  // For single-URL uploads (covers, group covers), use processed full size
                  fileToUpload = task.processedFile.full || task.originalFile;
                }

                console.log(`Uploading ${task.originalFile.name} (${uploadUrl.size || 'single'}) to:`, uploadUrl.uploadUrl);
                
                const uploadResponse = await fetch(uploadUrl.uploadUrl, {
                  method: "PUT",
                  body: fileToUpload,
                  headers: {
                    "Content-Type": fileToUpload.type,
                  },
                  signal: abortController.signal,
                });

                console.log(`Upload response for ${task.originalFile.name} (${uploadUrl.size || 'single'}):`, {
                  status: uploadResponse.status,
                  statusText: uploadResponse.statusText,
                  ok: uploadResponse.ok,
                });

                if (!uploadResponse.ok) {
                  const errorText = await uploadResponse.text();
                  console.error(`Upload failed for ${task.originalFile.name} (${uploadUrl.size || 'single'}):`, errorText);
                  throw new Error(
                    `Upload failed for ${task.originalFile.name}: ${uploadResponse.statusText}`,
                  );
                }

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
              console.error(`Failed to upload ${task.originalFile.name}:`, error);
              return {
                success: false,
                task,
                results: [],
                error: error instanceof Error ? error.message : 'Unknown error',
              };
            }
          });

          // Wait for all uploads in this batch to complete
          const batchResults = await Promise.allSettled(batchPromises);
          
          // Process batch results
          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              const taskResult = result.value;
              
              if (taskResult.success) {
                // Add successful uploads to results
                uploadResults.push(...taskResult.results);
                completedTasks++;
                
                // Update progress for this file
                updateProgress({
                  phase: "uploading-files",
                  files: displayFiles.map((displayFile, idx) => ({
                    name: displayFile.name,
                    processedName: files[idx]?.name,
                    progress: uploadTasks.find(t => t.fileIndex === idx) ? 100 : 0,
                    status: uploadResults.some(r => r.originalName === files[idx]?.name) ? "complete" : 
                           uploadTasks.slice(0, completedTasks).some(t => t.fileIndex === idx) ? "complete" : "pending",
                  })),
                  overallProgress: 10 + (completedTasks / files.length) * 80,
                  statusMessage: `Uploaded ${displayFiles[taskResult.task.fileIndex]?.name || taskResult.task.originalFile.name}`,
                  determinate: true,
                });
              } else {
                // Handle failed upload
                completedTasks++;
                
                // Check if this is an abort error
                if (taskResult.error?.includes('AbortError')) {
                  throw new Error('AbortError');
                }
                
                updateProgress({
                  phase: "uploading-files",
                  files: displayFiles.map((displayFile, idx) => ({
                    name: displayFile.name,
                    processedName: files[idx]?.name,
                    progress: 0,
                    status: uploadResults.some(r => r.originalName === files[idx]?.name) ? "complete" :
                           taskResult.task.fileIndex === idx ? "failed" : "pending",
                  })),
                  overallProgress: 10 + (completedTasks / files.length) * 80,
                  statusMessage: `Failed to upload ${displayFiles[taskResult.task.fileIndex]?.name || taskResult.task.originalFile.name}`,
                  determinate: true,
                });
              }
            } else {
              // Promise rejected (shouldn't happen due to try-catch, but handle it)
              console.error('Unexpected batch promise rejection:', result.reason);
              completedTasks++;
            }
          }
        }

        // Phase 3: Complete
        updateProgress({
          phase: "complete",
          files: displayFiles.map((displayFile, idx) => ({
            name: displayFile.name,
            processedName: files[idx]?.name,
            progress: 100,
            status: uploadResults.some((r) => r.originalName === files[idx]?.name)
              ? "complete"
              : "failed",
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
            
            // Only set isUploading to false after successful completion
            setState((prev) => ({
              ...prev,
              isUploading: false,
            }));
          } catch (error) {
            // If onSuccess fails, handle it as an error
            if (error instanceof Error && error.name === 'AbortError') {
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
      } catch (error) {
        // Handle AbortError specifically
        if (error instanceof Error && error.name === 'AbortError') {
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
