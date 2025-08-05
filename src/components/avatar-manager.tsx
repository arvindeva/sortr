"use client";

import { useRef } from "react";
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

export function AvatarManager({ currentImage }: AvatarManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadAvatarMutation,
    onSuccess: () => {
      toast.success("Avatar uploaded successfully!");
      window.location.reload(); // Simple refresh
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload avatar",
      );
    },
  });

  // Remove mutation
  const removeMutation = useMutation({
    mutationFn: removeAvatarMutation,
    onSuccess: () => {
      toast.success("Avatar removed successfully!");
      window.location.reload(); // Simple refresh
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove avatar",
      );
    },
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.type,
      )
    ) {
      toast.error("Only JPG, PNG, and WebP files are allowed.");
      return;
    }

    // Validate file size (1MB)
    if (file.size > 1024 * 1024) {
      toast.error("File size must be less than 1MB.");
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleRemoveAvatar = () => {
    if (!currentImage) return;
    removeMutation.mutate();
  };

  const isLoading = uploadMutation.isPending || removeMutation.isPending;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="neutralNoShadow"
            size="icon"
            className="h-6 w-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-secondary-background w-48"
        >
          <DropdownMenuItem
            onClick={handleUploadClick}
            disabled={isLoading}
            className="bg-secondary-background text-foreground cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Avatar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleRemoveAvatar}
            disabled={!currentImage || isLoading}
            className="bg-secondary-background text-foreground cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Avatar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
