"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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

// Update username mutation
const updateUsernameMutation = async (username: string) => {
  const response = await fetch("/api/user", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to update username");
  }

  return data;
};

export function EditUsernameButton({
  currentUsername,
}: EditUsernameButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUsername);

  const mutation = useMutation({
    mutationFn: updateUsernameMutation,
    onSuccess: (data) => {
      // Redirect to new username URL with full page refresh
      window.location.href = `/user/${data.username}`;
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setNewUsername(currentUsername);
      mutation.reset(); // Clear any previous errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newUsername === currentUsername) {
      setIsOpen(false);
      return;
    }

    mutation.mutate(newUsername);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="neutralNoShadow"
          size="icon"
          className="h-6 w-6"
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
            <label htmlFor="username" className="mb-2 block font-medium">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter new username"
              maxLength={20}
              disabled={mutation.isPending}
              autoFocus
            />
            <div className="text-foreground mt-2 space-y-1 text-xs">
              <p>• 3-20 characters long</p>
              <p>• Letters, numbers, underscores, and hyphens only</p>
              <p>• Must start and end with letter or number</p>
              <p>• No consecutive underscores or hyphens</p>
            </div>
          </div>

          {mutation.error && (
            <Badge variant="default" className="bg-red-500 text-white">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to update username. Please try again."}
            </Badge>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                mutation.isPending ||
                !newUsername.trim() ||
                newUsername === currentUsername
              }
              className="flex-1"
            >
              {mutation.isPending ? (
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
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
