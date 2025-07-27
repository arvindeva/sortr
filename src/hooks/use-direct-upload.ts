import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { UploadTokenRequest, UploadTokenResponse, UploadProgress, UploadedFile } from '@/types/upload';

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
    uploadedFiles: []
  });

  const updateProgress = useCallback((progress: UploadProgress) => {
    setState(prev => ({ ...prev, progress }));
    options.onProgress?.(progress);
  }, [options.onProgress]);

  const setError = useCallback((error: string) => {
    setState(prev => ({ 
      ...prev, 
      error, 
      isUploading: false,
      progress: null 
    }));
    options.onError?.(error);
  }, [options.onError]);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!session?.user) {
      setError('You must be logged in to upload files');
      return;
    }

    if (files.length === 0) {
      setError('No files selected');
      return;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      error: null,
      progress: {
        phase: 'requesting-tokens',
        files: files.map(file => ({
          name: file.name,
          progress: 0,
          status: 'pending'
        })),
        overallProgress: 0,
        statusMessage: 'Preparing upload...'
      }
    }));

    try {
      // Phase 1: Request upload tokens
      updateProgress({
        phase: 'requesting-tokens',
        files: files.map(file => ({
          name: file.name,
          progress: 0,
          status: 'pending'
        })),
        overallProgress: 0,
        statusMessage: 'Preparing upload...'
      });

      const fileInfos = files.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));

      const tokenResponse = await fetch('/api/upload-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: fileInfos,
          type: 'sorter-creation'
        } as UploadTokenRequest)
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        throw new Error(error.error || 'Failed to get upload tokens');
      }

      const tokenData: UploadTokenResponse = await tokenResponse.json();

      setState(prev => ({ ...prev, sessionId: tokenData.sessionId }));

      // Phase 2: Upload files to R2
      updateProgress({
        phase: 'uploading-files',
        files: files.map(file => ({
          name: file.name,
          progress: 0,
          status: 'pending'
        })),
        overallProgress: 10,
        statusMessage: 'Uploading files to R2...'
      });

      const uploadResults: UploadedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadUrl = tokenData.uploadUrls[i];

        // Update this file to uploading status
        updateProgress({
          phase: 'uploading-files',
          files: files.map((f, idx) => ({
            name: f.name,
            progress: idx < i ? 100 : idx === i ? 0 : 0,
            status: idx < i ? 'complete' : idx === i ? 'uploading' : 'pending'
          })),
          overallProgress: 10 + (i / files.length) * 80,
          statusMessage: `Uploading ${file.name}...`
        });

        try {
          console.log(`Uploading ${file.name} to:`, uploadUrl.uploadUrl);
          const uploadResponse = await fetch(uploadUrl.uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': file.type
            }
          });

          console.log(`Upload response for ${file.name}:`, {
            status: uploadResponse.status,
            statusText: uploadResponse.statusText,
            ok: uploadResponse.ok
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error(`Upload failed for ${file.name}:`, errorText);
            throw new Error(`Upload failed for ${file.name}: ${uploadResponse.statusText}`);
          }

          // Mark this file as complete
          const uploadedFile: UploadedFile = {
            key: uploadUrl.key,
            type: uploadUrl.fileType as 'cover' | 'item' | 'group-cover',
            originalName: uploadUrl.originalName,
            success: true
          };

          uploadResults.push(uploadedFile);

          // Update progress for completed file
          updateProgress({
            phase: 'uploading-files',
            files: files.map((f, idx) => ({
              name: f.name,
              progress: idx <= i ? 100 : 0,
              status: idx <= i ? 'complete' : 'pending'
            })),
            overallProgress: 10 + ((i + 1) / files.length) * 80,
            statusMessage: `Uploaded ${file.name}`
          });

        } catch (error) {
          // Mark this file as failed but continue with others
          updateProgress({
            phase: 'uploading-files',
            files: files.map((f, idx) => ({
              name: f.name,
              progress: idx < i ? 100 : idx === i ? 0 : 0,
              status: idx < i ? 'complete' : idx === i ? 'failed' : 'pending'
            })),
            overallProgress: 10 + ((i + 1) / files.length) * 80,
            statusMessage: `Failed to upload ${file.name}`
          });

          console.error(`Failed to upload ${file.name}:`, error);
          // Continue with next file instead of failing completely
        }
      }

      // Phase 3: Complete
      updateProgress({
        phase: 'complete',
        files: files.map((file, idx) => ({
          name: file.name,
          progress: 100,
          status: uploadResults.some(r => r.originalName === file.name) ? 'complete' : 'failed'
        })),
        overallProgress: 100,
        statusMessage: 'Upload complete!'
      });

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadedFiles: uploadResults
      }));

      options.onSuccess?.(uploadResults);

    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
    }
  }, [session, updateProgress, setError, options.onSuccess]);

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: null,
      error: null,
      sessionId: null,
      uploadedFiles: []
    });
  }, []);

  return {
    ...state,
    uploadFiles,
    reset
  };
}