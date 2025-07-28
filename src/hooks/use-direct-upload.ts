import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { generateSorterItemSizes, isCompressibleImage } from "@/lib/image-compression";
import type {
  UploadTokenRequest,
  UploadTokenResponse,
  UploadProgress,
  UploadedFile,
} from "@/types/upload";

interface DirectUploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (uploadedFiles: UploadedFile[]) => void;
  onError?: (error: string) => void;
}

interface DirectUploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  sessionId: string | null;
  uploadedFiles: UploadedFile[];
}

export function useDirectUpload(options: DirectUploadOptions = {}) {
  const { data: session } = useSession();
  const [state, setState] = useState<DirectUploadState>({
    isUploading: false,
    progress: null,
    error: null,
    sessionId: null,
    uploadedFiles: [],
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
    async (files: File[]) => {
      if (!session?.user) {
        setError("You must be logged in to upload files");
        return;
      }

      if (files.length === 0) {
        setError("No files selected");
        return;
      }

      setState((prev) => ({
        ...prev,
        isUploading: true,
        error: null,
        progress: {
          phase: "requesting-tokens",
          files: files.map((file) => ({
            name: file.name,
            progress: 0,
            status: "pending",
          })),
          overallProgress: 0,
          statusMessage: "Preparing upload...",
        },
      }));

      try {
        // Phase 1: Process images and generate multiple sizes
        updateProgress({
          phase: "requesting-tokens",
          files: files.map((file) => ({
            name: file.name,
            progress: 0,
            status: "pending",
          })),
          overallProgress: 0,
          statusMessage: "Processing images...",
        });

        // Process images to generate multiple sizes
        const processedFiles: { originalFile: File; thumbnail?: File; full?: File }[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Update progress for this file being processed
          updateProgress({
            phase: "requesting-tokens",
            files: files.map((f, idx) => ({
              name: f.name,
              progress: idx < i ? 100 : idx === i ? 50 : 0,
              status: idx < i ? "complete" : idx === i ? "uploading" : "pending",
            })),
            overallProgress: (i / files.length) * 5, // Use 5% for processing
            statusMessage: `Processing ${file.name}...`,
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
          files: files.map((file) => ({
            name: file.name,
            progress: 100,
            status: "complete",
          })),
          overallProgress: 5,
          statusMessage: "Requesting upload tokens...",
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
          files: files.map((file) => ({
            name: file.name,
            progress: 0,
            status: "pending",
          })),
          overallProgress: 10,
          statusMessage: "Uploading files to R2...",
        });

        const uploadResults: UploadedFile[] = [];

        // Group upload URLs by original file
        const urlsByOriginalFile = new Map<string, typeof tokenData.uploadUrls>();
        tokenData.uploadUrls.forEach(url => {
          const existing = urlsByOriginalFile.get(url.originalName) || [];
          existing.push(url);
          urlsByOriginalFile.set(url.originalName, existing);
        });

        for (let i = 0; i < files.length; i++) {
          const originalFile = files[i];
          const processedFile = processedFiles[i];
          const uploadUrls = urlsByOriginalFile.get(originalFile.name) || [];

          // Update this file to uploading status
          updateProgress({
            phase: "uploading-files",
            files: files.map((f, idx) => ({
              name: f.name,
              progress: idx < i ? 100 : idx === i ? 0 : 0,
              status:
                idx < i ? "complete" : idx === i ? "uploading" : "pending",
            })),
            overallProgress: 10 + (i / files.length) * 80,
            statusMessage: `Uploading ${originalFile.name}...`,
          });

          try {
            let fileUploadsSuccessful = 0;
            let totalUploads = 0;

            // Upload all sizes for this file
            for (const uploadUrl of uploadUrls) {
              totalUploads++;
              
              // Determine which file to upload based on size
              let fileToUpload: File;
              if (uploadUrl.size === 'thumbnail' && processedFile.thumbnail) {
                fileToUpload = processedFile.thumbnail;
              } else if (uploadUrl.size === 'full' && processedFile.full) {
                fileToUpload = processedFile.full;
              } else {
                // Fallback to original file
                fileToUpload = originalFile;
              }

              console.log(`Uploading ${originalFile.name} (${uploadUrl.size || 'single'}) to:`, uploadUrl.uploadUrl);
              
              const uploadResponse = await fetch(uploadUrl.uploadUrl, {
                method: "PUT",
                body: fileToUpload,
                headers: {
                  "Content-Type": fileToUpload.type,
                },
              });

              console.log(`Upload response for ${originalFile.name} (${uploadUrl.size || 'single'}):`, {
                status: uploadResponse.status,
                statusText: uploadResponse.statusText,
                ok: uploadResponse.ok,
              });

              if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error(`Upload failed for ${originalFile.name} (${uploadUrl.size || 'single'}):`, errorText);
                throw new Error(
                  `Upload failed for ${originalFile.name}: ${uploadResponse.statusText}`,
                );
              }

              fileUploadsSuccessful++;

              // Track all uploads (thumbnail and full) in results
              const uploadedFile: UploadedFile = {
                key: uploadUrl.key,
                type: uploadUrl.fileType as "cover" | "item" | "group-cover",
                originalName: uploadUrl.originalName,
                success: true,
              };
              uploadResults.push(uploadedFile);
            }

            // Only mark as complete if all uploads for this file succeeded
            if (fileUploadsSuccessful === totalUploads) {
              // Update progress for completed file
              updateProgress({
                phase: "uploading-files",
                files: files.map((f, idx) => ({
                  name: f.name,
                  progress: idx <= i ? 100 : 0,
                  status: idx <= i ? "complete" : "pending",
                })),
                overallProgress: 10 + ((i + 1) / files.length) * 80,
                statusMessage: `Uploaded ${originalFile.name}`,
              });
            } else {
              throw new Error(`Not all uploads completed for ${originalFile.name}`);
            }
          } catch (error) {
            // Mark this file as failed but continue with others
            updateProgress({
              phase: "uploading-files",
              files: files.map((f, idx) => ({
                name: f.name,
                progress: idx < i ? 100 : idx === i ? 0 : 0,
                status: idx < i ? "complete" : idx === i ? "failed" : "pending",
              })),
              overallProgress: 10 + ((i + 1) / files.length) * 80,
              statusMessage: `Failed to upload ${originalFile.name}`,
            });

            console.error(`Failed to upload ${originalFile.name}:`, error);
            // Continue with next file instead of failing completely
          }
        }

        // Phase 3: Complete
        updateProgress({
          phase: "complete",
          files: files.map((file, idx) => ({
            name: file.name,
            progress: 100,
            status: uploadResults.some((r) => r.originalName === file.name)
              ? "complete"
              : "failed",
          })),
          overallProgress: 100,
          statusMessage: "Upload complete!",
        });

        setState((prev) => ({
          ...prev,
          isUploading: false,
          uploadedFiles: uploadResults,
        }));

        options.onSuccess?.(uploadResults);
      } catch (error) {
        console.error("Upload error:", error);
        setError(error instanceof Error ? error.message : "Upload failed");
      }
    },
    [session, updateProgress, setError, options.onSuccess],
  );

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: null,
      error: null,
      sessionId: null,
      uploadedFiles: [],
    });
  }, []);

  return {
    ...state,
    uploadFiles,
    reset,
  };
}
