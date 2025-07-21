import { Box } from "@/components/ui/box";
import { EditUsernameButton } from "@/components/edit-username-button";

interface UserProfileHeaderProps {
  username: string;
  userSince: string;
  isOwnProfile: boolean;
}

export function UserProfileHeader({ 
  username, 
  userSince, 
  isOwnProfile 
}: UserProfileHeaderProps) {
  return (
    <section className="mb-8">
      <Box
        variant="primary"
        size="sm"
        className="flex items-center space-x-6 py-4"
      >
        {/* Avatar Placeholder */}
        <div className="bg-border text-main border-border rounded-base flex h-16 w-16 items-center justify-center border-2 md:h-24 md:w-24">
          <span className="text-4xl font-bold">
            {username?.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* User Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-lg font-bold md:text-4xl">
              {username}
            </h1>
            {/* Edit Username Button - Only show for own profile */}
            {isOwnProfile && (
              <EditUsernameButton 
                currentUsername={username}
              />
            )}
          </div>
          <p className="text-md font-medium">User since {userSince}</p>
        </div>
      </Box>
    </section>
  );
}