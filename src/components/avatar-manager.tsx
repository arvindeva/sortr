"use client";

import { useState, useRef } from "react";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AvatarManagerProps {
  currentImage?: string | null;
  username: string;
  isOwnProfile: boolean;
  onAvatarUpdate?: (newImageUrl: string | null) => void;
}

// Upload avatar mutation
const uploadAvatarMutation = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch("/api/upload-avatar", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Upload failed");
  }

  return result;
};

// Remove avatar mutation
const removeAvatarMutation = async () => {
  const response = await fetch("/api/remove-avatar", {
    method: "POST",
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Removal failed");
  }

  return result;
};

export function AvatarManager({
  currentImage,
  username,
  isOwnProfile,
  onAvatarUpdate,
}: AvatarManagerProps) {
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [isInitialImageLoading, setIsInitialImageLoading] = useState(!!currentImage);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadAvatarMutation,
    onSuccess: (result) => {
      toast.success("Avatar uploaded successfully!");
      setIsImageLoading(true); // Start showing loading overlay
      onAvatarUpdate?.(result.avatarUrl);
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error) => {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
      // Clear the input on error too
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: removeAvatarMutation,
    onSuccess: () => {
      toast.success("Avatar removed successfully!");
      onAvatarUpdate?.(null);
    },
    onError: (error) => {
      console.error("Removal error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to remove avatar");
    },
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (expanded to include WebP)
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP files are allowed.");
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB.");
      return;
    }

    // Trigger the mutation
    uploadMutation.mutate(file);
  };

  const handleRemoveAvatar = () => {
    if (!currentImage) return;
    removeMutation.mutate();
  };

  const isLoading = uploadMutation.isPending || removeMutation.isPending;

  // Handle image load completion
  const handleImageLoad = () => {
    setIsImageLoading(false);
    setIsInitialImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setIsInitialImageLoading(false);
    setImageError(true);
  };

  // Reset loading states when currentImage changes
  React.useEffect(() => {
    if (currentImage) {
      setIsInitialImageLoading(true);
      setImageError(false);
      
      // Preload the image to improve loading experience
      const img = new Image();
      img.onload = () => {
        // Image is cached, loading will be faster next time
      };
      img.onerror = () => {
        setImageError(true);
        setIsInitialImageLoading(false);
      };
      img.src = currentImage;
    } else {
      setIsInitialImageLoading(false);
      setImageError(false);
    }
  }, [currentImage]);

  return (
    <div className="relative">
      {/* Avatar Display */}
      <div className="border-border rounded-base flex h-16 w-16 items-center justify-center border-2 md:h-24 md:w-24 overflow-hidden relative">
        {currentImage && !imageError ? (
          <>
            <img
              src={currentImage}
              alt={`${username}'s avatar`}
              className={`h-full w-full object-cover transition-opacity duration-200 ${
                isInitialImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {/* Show placeholder while initial image loads */}
            {isInitialImageLoading && (
              <div className="absolute inset-0 shimmer text-main flex items-center justify-center">
                <span className="text-4xl font-bold">
                  {username?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="bg-secondary-background text-main flex h-full w-full items-center justify-center">
            <span className="text-4xl font-bold">
              {username?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Loading Overlay - shown when uploading new image */}
        {isImageLoading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
              <span className="text-xs text-white font-medium">Loading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Controls - Only show for own profile */}
      {isOwnProfile && (
        <>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Pencil icon overlay */}
          <div className="absolute -bottom-1 -right-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={handleUploadClick}
                  disabled={isLoading}
                  className="cursor-pointer"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Avatar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleRemoveAvatar}
                  disabled={!currentImage || isLoading}
                  className="cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Avatar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  );
}