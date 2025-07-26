"use client";

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { compressImages, isCompressibleImage, formatFileSize } from '@/lib/image-compression';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number;
  disabled?: boolean;
  existingFiles?: File[];
  enableCompression?: boolean;
}

export function FileUploadZone({
  onFilesSelected,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/webp'],
  maxFiles = 25,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  disabled = false,
  existingFiles = [],
  enableCompression = true
}: FileUploadZoneProps) {
  const [dragError, setDragError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState({ completed: 0, total: 0 });

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setDragError(null);

    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => {
        if (file.errors) {
          return file.errors.map((error: any) => error.message).join(', ');
        }
        return 'Invalid file';
      });
      setDragError(`Some files were rejected: ${errors.join('; ')}`);
    }

    if (acceptedFiles.length > 0) {
      const totalFiles = existingFiles.length + acceptedFiles.length;
      if (totalFiles > maxFiles) {
        setDragError(`Too many files. Maximum ${maxFiles} files allowed.`);
        return;
      }

      // Compress images if enabled
      if (enableCompression) {
        const compressibleFiles = acceptedFiles.filter(isCompressibleImage);
        const nonCompressibleFiles = acceptedFiles.filter(file => !isCompressibleImage(file));

        if (compressibleFiles.length > 0) {
          setIsCompressing(true);
          setCompressionProgress({ completed: 0, total: compressibleFiles.length });

          try {
            const compressionResults = await compressImages(
              compressibleFiles,
              { quality: 0.85, maxWidth: 1920, maxHeight: 1920, format: 'jpeg' },
              (completed, total) => {
                setCompressionProgress({ completed, total });
              }
            );

            const compressedFiles = compressionResults.map(result => result.file);
            onFilesSelected([...compressedFiles, ...nonCompressibleFiles]);
          } catch (error) {
            console.error('Compression failed:', error);
            setDragError('Image compression failed. Using original files.');
            onFilesSelected(acceptedFiles);
          } finally {
            setIsCompressing(false);
          }
        } else {
          onFilesSelected(acceptedFiles);
        }
      } else {
        onFilesSelected(acceptedFiles);
      }
    }
  }, [onFilesSelected, maxFiles, existingFiles.length, enableCompression]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    maxSize: maxFileSize,
    disabled
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-border'}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
            `}
          >
            <input {...getInputProps()} />
            
            <div className="space-y-2">
              <div className="text-4xl">📁</div>
              
              {isCompressing ? (
                <div>
                  <p className="text-lg font-medium">Compressing images...</p>
                  <p className="text-sm text-muted-foreground">
                    {compressionProgress.completed} of {compressionProgress.total} images processed
                  </p>
                </div>
              ) : isDragActive ? (
                <div>
                  <p className="text-lg font-medium">Drop files here...</p>
                  <p className="text-sm text-muted-foreground">Release to upload</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">
                    {disabled ? 'Upload in progress...' : 'Drag & drop images here'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or <span className="text-primary">click to browse</span>
                  </p>
                  {enableCompression && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Images will be compressed to JPG format
                    </p>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Supported: JPG, PNG, WebP</p>
                <p>Max {maxFiles} files, {formatFileSize(maxFileSize)} per file</p>
                {existingFiles.length > 0 && (
                  <p>{existingFiles.length} file(s) already selected</p>
                )}
              </div>
            </div>
          </div>

          {dragError && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{dragError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {existingFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Selected Files ({existingFiles.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {existingFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-secondary/20 rounded text-sm"
                  >
                    <span className="truncate flex-1" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}