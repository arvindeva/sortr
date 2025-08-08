"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { EditUsernameButton } from "@/components/edit-username-button";
import { AvatarManager } from "@/components/avatar-manager";

interface UserProfileHeaderServerProps {
  username: string;
  userSince: string;
  isOwnProfile: boolean;
  currentImage?: string | null;
}

export function UserProfileHeaderServer({
  username,
  userSince,
  isOwnProfile,
  currentImage,
}: UserProfileHeaderServerProps) {
  const [displayedUsername, setDisplayedUsername] = useState(username);
  return (
    <section className="mb-4 md:mb-8">
      <div className="flex items-center space-x-3 py-4 md:space-x-6">
        {/* Avatar */}
        <div className="relative">
          <div className="border-border rounded-base flex h-28 w-28 items-center justify-center overflow-hidden border-2 md:h-48 md:w-48">
            {currentImage ? (
              <img
                src={currentImage}
                alt={`${displayedUsername}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="bg-secondary-background text-main flex h-full w-full items-center justify-center">
                <span className="text-4xl font-bold">
                  {displayedUsername?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Avatar Management - Client-side island */}
          {isOwnProfile && (
            <div className="absolute -right-1 -bottom-1">
              <AvatarManager currentImage={currentImage} />
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <PageHeader>{displayedUsername}</PageHeader>
            {/* Edit Username Button - Only show for own profile */}
            {isOwnProfile && (
              <EditUsernameButton 
                currentUsername={displayedUsername} 
                onUsernameUpdate={setDisplayedUsername}
              />
            )}
          </div>
          <p className="font-medium">User since {userSince}</p>
        </div>
      </div>
    </section>
  );
}
