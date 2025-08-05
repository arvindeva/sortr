"use client";

import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Box } from "@/components/ui/box";
import { PageHeader } from "@/components/ui/page-header";
import { EditUsernameButton } from "@/components/edit-username-button";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Upload, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserProfileHeaderProps {
  username: string;
  userSince: string;
  isOwnProfile: boolean;
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

export function UserProfileHeader({
  username,
  userSince,
  isOwnProfile,
  currentImage,
}: UserProfileHeaderProps) {
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
    <section className="mb-4 md:mb-8">
      <div className="flex items-center space-x-3 py-4 md:space-x-6">
        {/* Avatar */}
        <div className="relative">
          <div className="border-border rounded-base flex h-28 w-28 items-center justify-center overflow-hidden border-2 md:h-48 md:w-48">
            {currentImage ? (
              <img
                src={currentImage}
                alt={`${username}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-secondary-background text-main flex h-full w-full items-center justify-center">
                <span className="text-4xl font-bold">
                  {username?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Edit Controls - Only show for own profile */}
          {isOwnProfile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="absolute -right-1 -bottom-1">
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
                  <DropdownMenuContent align="end" className="w-48 bg-secondary-background">
                    <DropdownMenuItem
                      onClick={handleUploadClick}
                      disabled={isLoading}
                      className="cursor-pointer bg-secondary-background text-foreground"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Avatar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleRemoveAvatar}
                      disabled={!currentImage || isLoading}
                      className="cursor-pointer bg-secondary-background text-foreground"
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

        {/* User Info */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <PageHeader>{username}</PageHeader>
            {/* Edit Username Button - Only show for own profile */}
            {isOwnProfile && <EditUsernameButton currentUsername={username} />}
          </div>
          <p className="font-medium">User since {userSince}</p>
        </div>
      </div>
    </section>
  );
}
