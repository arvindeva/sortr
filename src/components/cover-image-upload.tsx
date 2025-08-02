"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Box } from "@/components/ui/box";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { compressImages, isCompressibleImage } from "@/lib/image-compression";

interface CoverImageUploadProps {
  onImageSelect: (file: File | null) => void;
  selectedFile: File | null;
  previewUrl: string | null;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function CoverImageUpload({
  onImageSelect,
  selectedFile,
  previewUrl,
  disabled = false,
}: CoverImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP files are allowed");
      return false;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size must be less than 10MB");
      return false;
    }

    return true;
  };

  const handleFileSelect = async (file: File) => {
    if (validateFile(file)) {
      try {
        // Compress image if it's compressible
        if (isCompressibleImage(file)) {
          const compressionResults = await compressImages([file], {
            quality: 0.85,
            exactSize: { width: 300, height: 300 },
            format: "jpeg",
          });
          const compressedFile = compressionResults[0].file;
          onImageSelect(compressedFile);
        } else {
          onImageSelect(file);
        }
      } catch (error) {
        console.error("Cover image compression failed:", error);
        onImageSelect(file);
      }
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemoveImage = () => {
    onImageSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <FormLabel>Cover Image (Optional)</FormLabel>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
      />

      {/* Upload area */}
      {!selectedFile && !previewUrl ? (
        <Box
          variant="white"
          size="md"
          className={`cursor-pointer transition-colors ${isDragging ? "bg-secondary-background" : "bg-background"} ${disabled ? "cursor-not-allowed opacity-50" : "hover:bg-secondary-background"} `}
          onClick={!disabled ? handleSelectClick : undefined}
        >
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <ImageIcon size={48} className="text-muted-foreground mb-4" />
            <div className="mb-2">
              <p className="font-medium">Click to upload cover image</p>
              <p className="mt-1 text-xs">JPG, PNG, or WebP up to 10MB</p>
            </div>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              disabled={disabled}
              className="mt-2"
            >
              <Upload size={16} className="mr-2" />
              Select Image
            </Button>
          </div>
        </Box>
      ) : (
        /* Preview area */
        <Box variant="white" size="md" className="relative">
          <div className="flex items-start gap-4 p-4">
            {/* Image preview */}
            {previewUrl && (
              <div className="flex-shrink-0">
                <img
                  src={previewUrl}
                  alt="Cover preview"
                  className="border-border shadow-shadow h-20 w-20 rounded-lg border-2 object-cover"
                />
              </div>
            )}

            {/* File info */}
            <div className="min-w-0 flex-1">
              {selectedFile ? (
                <>
                  <p className="truncate font-medium">{selectedFile.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Will be resized to 300x300px
                  </p>
                </>
              ) : (
                <>
                  <p className="truncate font-medium">Current cover image</p>
                  <p className="text-muted-foreground text-xs">
                    Existing cover image
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Click "Replace Image" to change
                  </p>
                </>
              )}
            </div>

            {/* Remove button */}
            <Button
              type="button"
              variant="neutralNoShadow"
              size="sm"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="h-8 w-8 flex-shrink-0 p-0"
              title="Remove image"
            >
              <X size={14} />
            </Button>
          </div>

          {/* Replace button */}
          <div className="border-border border-t px-4 py-3">
            <Button
              type="button"
              variant="neutral"
              size="sm"
              onClick={handleSelectClick}
              disabled={disabled}
              className="w-full"
            >
              <Upload size={16} className="mr-2" />
              Replace Image
            </Button>
          </div>
        </Box>
      )}

      {/* Helper text */}
      <p className="text-xs">
        The cover image will be displayed on your sorter's profile and in
        listings. Images are automatically cropped to square and resized.
      </p>
    </div>
  );
}
