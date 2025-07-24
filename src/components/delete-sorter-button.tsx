"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, AlertTriangle } from "lucide-react";

interface DeleteSorterButtonProps {
  sorterSlug: string;
  sorterTitle: string;
}

export function DeleteSorterButton({
  sorterSlug,
  sorterTitle,
}: DeleteSorterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setError(null);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/sorters/${sorterSlug}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete sorter");
      }

      // Immediately redirect to home page with full page refresh
      // This prevents the brief moment where user stays on the deleted page
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting sorter:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete sorter. Please try again.",
      );
      setIsDeleting(false); // Only set loading false on error
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="neutral"
          size="default"
          className="group"
          title={`Delete "${sorterTitle}"`}
        >
          <Trash2
            className="transition-transform duration-200 group-hover:scale-110"
            size={20}
          />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            Delete Sorter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-2 font-medium">
              Are you sure you want to delete <strong>"{sorterTitle}"</strong>?
            </p>
            <p className="text-foreground">
              This action cannot be undone. All sorting results and data
              associated with this sorter will be permanently deleted.
            </p>
          </div>

          {error && (
            <div className="rounded-base border-border border-2 bg-red-500 p-3 text-white">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                "Deleting..."
              ) : (
                <>
                  <Trash2 className="mr-2" size={16} />
                  Delete Forever
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="neutral"
              onClick={() => setIsOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
