"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { track } from "@/lib/analytics";

interface ShareImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blob: Blob | null;
  filename: string;
  /** Sorter title — used for the share-sheet payload and analytics. */
  title: string;
  variant: "top10" | "full";
}

/**
 * Post-generation preview of the ranking share card. The image is a plain
 * <img> so iOS long-press offers "Add to Photos"; the Share button opens the
 * OS share sheet WITH the PNG file (iOS: includes "Save Image" straight to
 * the camera roll) — the `<a download>` path iOS Safari mishandles is kept
 * only as the desktop/Android download.
 */
export function ShareImageDialog({
  open,
  onOpenChange,
  blob,
  filename,
  title,
  variant,
}: ShareImageDialogProps) {
  // Object URL lives exactly as long as the blob is on screen.
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [blob]);

  const file = useMemo(
    () => (blob ? new File([blob], filename, { type: "image/png" }) : null),
    [blob, filename],
  );

  // Share-with-file support (iOS 15+, Android Chrome). Recomputed on open so
  // SSR (no navigator) safely resolves to false.
  const canShareFile =
    !!file &&
    typeof navigator !== "undefined" &&
    !!navigator.canShare?.({ files: [file] });

  // IMPORTANT: navigator.share must run synchronously in the click gesture —
  // no awaits before it — or Safari rejects with NotAllowedError.
  const handleShare = () => {
    if (!file) return;
    navigator
      .share({ files: [file], title })
      .then(() =>
        track("image_downloaded", {
          sorterTitle: title,
          variant,
          method: "share-sheet",
        }),
      )
      .catch(() => {
        // User cancelled the sheet — silent no-op.
      });
  };

  const handleDownload = () => {
    if (!objectUrl) return;
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    track("image_downloaded", {
      sorterTitle: title,
      variant,
      method: "download",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Image ready</DialogTitle>
          {/* Long-press hint — only meaningful on touch devices. */}
          <DialogDescription className="hidden font-mono text-xs text-muted-foreground [@media(pointer:coarse)]:block">
            press and hold the image to save it to your photos
          </DialogDescription>
        </DialogHeader>

        {objectUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={objectUrl}
            alt={`${title} — ranking image`}
            className="max-h-[60vh] w-full rounded-[10px] border border-border object-contain"
          />
        )}

        <div className="flex flex-col gap-2.5 sm:flex-row">
          {canShareFile && (
            <Button arcade onClick={handleShare} className="flex-1">
              <Share2 size={16} />
              Share image
            </Button>
          )}
          <Button
            arcade
            variant={canShareFile ? "neutral" : "default"}
            onClick={handleDownload}
            className="flex-1"
          >
            <Download size={16} />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
