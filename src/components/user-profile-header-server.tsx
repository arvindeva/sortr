"use client";

import { useState } from "react";
import { EditUsernameButton } from "@/components/edit-username-button";
import { AvatarManager } from "@/components/avatar-manager";

interface UserProfileHeaderServerProps {
  username: string;
  isOwnProfile: boolean;
  currentImage?: string | null;
  sorterCount: number;
  rankingCount: number;
}

export function UserProfileHeaderServer({
  username,
  isOwnProfile,
  currentImage,
  sorterCount,
  rankingCount,
}: UserProfileHeaderServerProps) {
  const [displayedUsername, setDisplayedUsername] = useState(username);
  const initial = displayedUsername?.charAt(0).toUpperCase();

  return (
    <section className="mb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-7">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div
            className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl sm:h-[150px] sm:w-[150px]"
            style={{
              background: "linear-gradient(135deg,#ff2e7e,#9b6bff)",
              boxShadow: "0 0 40px rgba(255,46,126,.25)",
            }}
          >
            {currentImage ? (
              <img
                src={currentImage}
                alt={`${displayedUsername}'s avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="display font-black"
                style={{
                  fontSize: "clamp(3.5rem,9vw,4.625rem)",
                  color: "rgba(0,0,0,.72)",
                }}
              >
                {initial}
              </span>
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
        <div className="min-w-0 flex-1">
          <div className="hud mb-2 text-xs text-cyan-ink">● Profile</div>
          <div className="flex items-center gap-2">
            <h1 className="display text-[clamp(2.5rem,8vw,3.625rem)] leading-[0.9] font-black text-foreground">
              {displayedUsername}
            </h1>
            {/* Edit Username Button - Only show for own profile */}
            {isOwnProfile && (
              <EditUsernameButton
                currentUsername={displayedUsername}
                onUsernameUpdate={setDisplayedUsername}
              />
            )}
          </div>
          <div className="mt-3.5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[13px] text-muted-foreground">
            <span>
              <span className="font-bold text-main-ink">{sorterCount}</span>{" "}
              {sorterCount === 1 ? "SORTER" : "SORTERS"}
            </span>
            <span>
              <span className="font-bold text-cyan-ink">{rankingCount}</span>{" "}
              {rankingCount === 1 ? "RANKING" : "RANKINGS"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
