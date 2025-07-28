"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { UploadProgress } from "@/types/upload";

interface UploadProgressDialogProps {
  open: boolean;
  progress: UploadProgress | null;
  onOpenChange?: (open: boolean) => void;
}

export function UploadProgressDialog({ 
  open, 
  progress, 
  onOpenChange 
}: UploadProgressDialogProps) {
  if (!progress) return null;

  const getPhaseTitle = (phase: UploadProgress['phase']) => {
    switch (phase) {
      case 'requesting-tokens':
        return 'Preparing upload...';
      case 'uploading-files':
        return 'Uploading files...';
      case 'creating-sorter':
        return 'Creating sorter...';
      case 'complete':
        return 'Upload complete!';
      default:
        return 'Processing...';
    }
  };

  const getPhaseDescription = (phase: UploadProgress['phase']) => {
    switch (phase) {
      case 'requesting-tokens':
        return 'Preparring upload...';
      case 'uploading-files':
        const completedFiles = progress.files.filter(f => f.status === 'complete').length;
        const totalFiles = progress.files.length;
        return `${completedFiles}/${totalFiles} files uploaded`;
      case 'creating-sorter':
        return 'Saving sorter data';
      case 'complete':
        return 'All files uploaded successfully!';
      default:
        return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return '✅';
      case 'uploading':
        return '📤';
      case 'failed':
        return '❌';
      case 'pending':
      default:
        return '⏳';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getPhaseTitle(progress.phase)}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{getPhaseDescription(progress.phase)}</span>
              <span>{Math.round(progress.overallProgress)}%</span>
            </div>
            <Progress value={progress.overallProgress} className="h-2" />
          </div>

          {/* Individual file progress */}
          {progress.phase === 'uploading-files' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Files:</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span>{getStatusIcon(file.status)}</span>
                      <span className="truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground ml-2">
                      {file.status === 'uploading' ? `${file.progress}%` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error handling */}
          {progress.files.some(f => f.status === 'failed') && (
            <div className="text-sm text-destructive">
              Some files failed to upload. You can retry or continue without them.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
