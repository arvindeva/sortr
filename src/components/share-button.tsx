"use client";

import { useState } from "react";
import { Share2, Link2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useDownloadRankingImage } from "@/hooks/use-download-ranking-image";
import { track } from "@/lib/analytics";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface ShareButtonProps {
  size?: "sm" | "default" | "lg" | "icon";
  hideTextOnMobile?: boolean;
  rankingData?: {
    sorterTitle: string;
    username: string;
    rankings: RankedItem[];
    createdAt: Date;
    selectedTags?: string[];
  };
}

export function ShareButton({
  size = "default",
  // hideTextOnMobile is accepted for call-site compatibility but no longer used:
  // the button is always labeled now so sharing is obvious on mobile.
  rankingData,
}: ShareButtonProps) {
  const { downloadImage, isGenerating } = useDownloadRankingImage();
  const [open, setOpen] = useState(false);

  // On mobile, the OS share sheet is the expected one-tap pattern (and surfaces
  // Twitter/IG/etc. directly — where our fandom traffic shares). Try it first;
  // fall back to the dropdown on desktop where navigator.share is absent.
  const tryNativeShare = async (): Promise<boolean> => {
    if (typeof navigator === "undefined" || !navigator.share) return false;
    try {
      await navigator.share({
        title: rankingData
          ? `${rankingData.sorterTitle} — ranked by @${rankingData.username}`
          : "sortr",
        url: window.location.href,
      });
      track("share_clicked", {
        sorterTitle: rankingData?.sorterTitle,
        method: "native",
      });
      return true;
    } catch {
      // User cancelled the sheet, or it failed — treat as "handled" so we don't
      // also pop the dropdown.
      return true;
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    track("share_clicked", {
      sorterTitle: rankingData?.sorterTitle,
      method: "copy",
    });
    toast.success("Link copied!");
  };

  const handleDownloadImage = async () => {
    if (!rankingData) {
      toast.error("Ranking data not available for download");
      return;
    }

    await downloadImage(rankingData);
  };

  const handleTriggerClick = async (e: React.MouseEvent) => {
    // Try the native share sheet first (mobile). If it fired, prevent the
    // dropdown from opening; otherwise let the dropdown handle it (desktop).
    const shared = await tryNativeShare();
    if (shared) {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="neutral"
          size={size}
          onClick={handleTriggerClick}
        >
          {/* Always labeled (no icon-only on mobile) so the share action — the
              thing that propagates the loop — is obvious on phones. */}
          <Share2 size={16} />
          <span className="ml-2">Share</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyLink}>
          <Link2 className="mr-2" size={16} />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDownloadImage}
          disabled={isGenerating || !rankingData}
        >
          <Download className="mr-2" size={16} />
          {isGenerating ? "Generating..." : "Download Image"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
