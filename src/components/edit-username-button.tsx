"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Check } from "lucide-react";

interface EditUsernameButtonProps {
  currentUsername: string;
}

export function EditUsernameButton({
  currentUsername,
}: EditUsernameButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUsername);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setNewUsername(currentUsername);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newUsername === currentUsername) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: newUsername }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update username");
      }

      // Immediately redirect to new username URL with full page refresh
      // This prevents the brief moment where old username is still visible
      window.location.href = `/user/${data.username}`;
    } catch (error) {
      console.error("Error updating username:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update username. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="neutral"
          size="sm"
          className="h-6 w-6 p-0"
          title="Edit username"
        >
          <Pencil size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Username</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium"
            >
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              maxLength={20}
              disabled={isLoading}
              autoFocus
            />
            <div className="text-foreground mt-2 space-y-1 text-xs">
              <p>• 3-20 characters long</p>
              <p>• Letters, numbers, underscores, and hyphens only</p>
              <p>• Must start and end with letter or number</p>
              <p>• No consecutive underscores or hyphens</p>
            </div>
          </div>

          {error && (
            <Badge variant="default" className="bg-red-500 text-white">
              {error}
            </Badge>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                isLoading ||
                !newUsername.trim() ||
                newUsername === currentUsername
              }
              className="flex-1"
            >
              {isLoading ? (
                "Updating..."
              ) : (
                <>
                  <Check className="mr-2" size={16} />
                  Save
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="neutral"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
