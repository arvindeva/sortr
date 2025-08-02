"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Progress } from "@/components/ui/progress";
import { SortingBarsLoader } from "@/components/ui/sorting-bars-loader";
import { Check } from "lucide-react";
import type { UploadProgress } from "@/types/upload";

interface UploadProgressDialogProps {
  open: boolean;
  progress: UploadProgress | null;
  onOpenChange?: (open: boolean) => void;
  onCancel?: () => void;
}

export function UploadProgressDialog({
  open,
  progress,
  onOpenChange,
  onCancel,
}: UploadProgressDialogProps) {
  if (!progress) return null;

  const getPhaseTitle = (phase: UploadProgress["phase"]) => {
    switch (phase) {
      case "requesting-tokens":
        return "Creating sorter...";
      case "uploading-files":
        return "Uploading Images...";
      case "creating-sorter":
        return "Creating sorter...";
      case "complete":
        return "Upload complete!";
      default:
        return "Processing...";
    }
  };

  const getPhaseDescription = (phase: UploadProgress["phase"]) => {
    switch (phase) {
      case "requesting-tokens":
        return "Preparing upload...";
      case "uploading-files":
        const completedFiles = progress.files.filter(
          (f) => f.status === "complete",
        ).length;
        const totalFiles = progress.files.length;
        return `${completedFiles}/${totalFiles} images uploaded`;
      case "creating-sorter":
        return "Processing sorter...";
      case "complete":
        return "All files uploaded successfully!";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return "✅";
      case "uploading":
        return "📤";
      case "failed":
        return "❌";
      case "pending":
      default:
        return "⏳";
    }
  };

  const canCancel = progress.phase !== "complete";

  const handleCancel = () => {
    if (onCancel && canCancel) {
      onCancel();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && canCancel) {
      // If user tries to close during upload, treat it as cancel
      handleCancel();
    } else if (!open && !canCancel) {
      // Allow closing after completion
      onOpenChange?.(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={canCancel ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={canCancel ? undefined : (e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{getPhaseTitle(progress.phase)}</DialogTitle>
          <VisuallyHidden.Root>
            <DialogDescription>
              Upload progress for creating a new sorter with files
            </DialogDescription>
          </VisuallyHidden.Root>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{getPhaseDescription(progress.phase)}</span>
              {progress.determinate && (
                <span>{Math.round(progress.overallProgress)}%</span>
              )}
            </div>
            {progress.determinate ? (
              <Progress 
                value={progress.overallProgress} 
                className="h-4" 
                shimmer={progress.phase === "uploading-files"}
              />
            ) : progress.statusMessage === "Redirecting to sorter..." ? (
              <div className="flex justify-center py-2">
                <div className="relative">
                  <div className="border-main bg-main flex h-12 w-12 animate-pulse items-center justify-center rounded-full border-2">
                    <Check
                      className="text-background h-8 w-8 animate-bounce"
                      strokeWidth={3}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-2">
                <SortingBarsLoader />
              </div>
            )}
          </div>

          {/* Individual file progress */}
          {progress.phase === "uploading-files" && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Files:</div>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {progress.files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span>{getStatusIcon(file.status)}</span>
                    <span className="truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error handling */}
          {progress.files.some((f) => f.status === "failed") && (
            <div className="text-destructive text-sm">
              Some files failed to upload. You can retry or continue without
              them.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
