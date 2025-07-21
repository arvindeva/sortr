"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface DeleteSorterButtonProps {
  sorterSlug: string;
  sorterTitle: string;
}

export function DeleteSorterButton({ sorterSlug, sorterTitle }: DeleteSorterButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    // Show confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${sorterTitle}"?\n\nThis action cannot be undone. All sorting results and data associated with this sorter will be permanently deleted.`
    );

    if (!isConfirmed) {
      return;
    }

    setIsDeleting(true);

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

      // Show success message
      alert(`"${data.title}" has been deleted successfully.`);
      
      // Redirect to home page
      router.push("/");
      router.refresh(); // Force refresh to update any cached data
      
    } catch (error) {
      console.error("Error deleting sorter:", error);
      alert(
        error instanceof Error 
          ? `Failed to delete sorter: ${error.message}` 
          : "Failed to delete sorter. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="neutral"
      size="lg"
      onClick={handleDelete}
      disabled={isDeleting}
      className="group"
      title={`Delete "${sorterTitle}"`}
    >
      <Trash2
        className="mr-2 transition-transform duration-200 group-hover:scale-110"
        size={20}
      />
      {isDeleting ? "Deleting..." : "Delete"}
    </Button>
  );
}