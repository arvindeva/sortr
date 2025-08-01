"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteRankingButtonProps {
  rankingId: string;
  sorterTitle: string;
}

export function DeleteRankingButton({
  rankingId,
  sorterTitle,
}: DeleteRankingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);

      const response = await fetch(`/api/rankings/${rankingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete ranking");
      }

      toast.success("Ranking deleted successfully");

      // Redirect to homepage
      router.push("/");
    } catch (error) {
      console.error("Error deleting ranking:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete ranking",
      );
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm">
          <Trash2 size={16} />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Ranking</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete your ranking for "{sorterTitle}"?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="neutral"
            onClick={() => setIsOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-red-500 hover:bg-red-600"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              "Deleting..."
            ) : (
              <>
                <Trash2 className="mr-2" size={16} />
                Delete Ranking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
