"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Box } from "@/components/ui/box";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

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

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      onImageSelect(file);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      {!selectedFile ? (
        <Box 
          variant="white" 
          size="md" 
          className={`
            cursor-pointer transition-colors
            ${isDragging ? 'bg-secondary-background' : 'bg-background'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary-background'}
          `}
          onClick={!disabled ? handleSelectClick : undefined}
        >
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <ImageIcon size={48} className="mb-4 text-muted-foreground" />
            <div className="mb-2">
              <p className="text-sm font-medium">Click to upload cover image</p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, or WebP up to 10MB
              </p>
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
                  className="h-20 w-20 rounded-lg border-2 border-border object-cover shadow-shadow"
                />
              </div>
            )}
            
            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Will be resized to 300x300px
              </p>
            </div>

            {/* Remove button */}
            <Button
              type="button"
              variant="neutralNoShadow"
              size="sm"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="h-8 w-8 p-0 flex-shrink-0"
              title="Remove image"
            >
              <X size={14} />
            </Button>
          </div>

          {/* Replace button */}
          <div className="border-t border-border px-4 py-3">
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
      <p className="text-xs text-muted-foreground">
        The cover image will be displayed on your sorter's profile and in listings.
        Images are automatically cropped to square and resized.
      </p>
    </div>
  );
}