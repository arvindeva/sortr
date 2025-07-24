"use client";

import { useState, useEffect } from "react";
import { Box } from "@/components/ui/box";
import { EditUsernameButton } from "@/components/edit-username-button";
import { AvatarManager } from "@/components/avatar-manager";

interface UserProfileHeaderProps {
  username: string;
  userSince: string;
  isOwnProfile: boolean;
  currentImage?: string | null;
}

export function UserProfileHeader({
  username,
  userSince,
  isOwnProfile,
  currentImage,
}: UserProfileHeaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentImage || null);

  // Sync local state with prop changes
  useEffect(() => {
    setAvatarUrl(currentImage || null);
  }, [currentImage]);

  const handleAvatarUpdate = (newImageUrl: string | null) => {
    setAvatarUrl(newImageUrl);
  };

  return (
    <section className="mb-8">
      <Box
        variant="primary"
        size="sm"
        className="flex items-center space-x-6 py-4"
      >
        {/* Avatar Manager */}
        <AvatarManager
          currentImage={avatarUrl}
          username={username}
          isOwnProfile={isOwnProfile}
          onAvatarUpdate={handleAvatarUpdate}
        />

        {/* User Info */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <h1 className="text-lg font-bold md:text-4xl">{username}</h1>
            {/* Edit Username Button - Only show for own profile */}
            {isOwnProfile && <EditUsernameButton currentUsername={username} />}
          </div>
          <p className="text-md font-medium">User since {userSince}</p>
        </div>
      </Box>
    </section>
  );
}
