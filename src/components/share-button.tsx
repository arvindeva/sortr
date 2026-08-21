"use client";

import { useEffect, useState } from "react";
import { Share2, Link2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  useRankingImage,
  type GeneratedRankingImage,
  type RankingImageVariant,
} from "@/hooks/use-ranking-image";
import { ShareImageDialog } from "@/components/share-image-dialog";
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
  const { generateImage, isGenerating } = useRankingImage();

  // The generated card + its preview dialog. `generated` sticks around after
  // close so reopening the same variant could be instant, but regenerating is
  // cheap enough that we simply generate per menu click.
  const [generated, setGenerated] = useState<
    (GeneratedRankingImage & { variant: RankingImageVariant }) | null
  >(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Detect Web Share support after mount (avoids SSR/hydration mismatch). When
  // available (mobile), we render a plain button that opens the OS share sheet
  // directly on tap — one tap, surfaces Twitter/IG/etc. where our fandom shares.
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  // IMPORTANT: navigator.share must be called synchronously within the click's
  // user gesture (no await before it), or the browser rejects it.
  const handleNativeShare = () => {
    const shareData = {
      title: rankingData
        ? `${rankingData.sorterTitle} — ranked by @${rankingData.username}`
        : "sortr",
      url: window.location.href,
    };
    navigator
      .share(shareData)
      .then(() =>
        track("share_clicked", {
          sorterTitle: rankingData?.sorterTitle,
          method: "native",
        }),
      )
      .catch(() => {
        // User cancelled or it failed — no-op.
      });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    track("share_clicked", {
      sorterTitle: rankingData?.sorterTitle,
      method: "copy",
    });
    toast.success("Link copied!");
  };

  const handleGenerateImage = async (variant: RankingImageVariant) => {
    if (!rankingData) {
      toast.error("Ranking data not available for download");
      return;
    }
    const result = await generateImage(rankingData, variant);
    if (result) {
      setGenerated({ ...result, variant });
      setDialogOpen(true);
    }
  };

  const dialog = (
    <ShareImageDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      blob={generated?.blob ?? null}
      filename={generated?.filename ?? "sortr-ranking.png"}
      title={rankingData?.sorterTitle ?? "sortr"}
      variant={generated?.variant ?? "top10"}
      itemCount={rankingData?.rankings.length}
    />
  );

  // The two image choices, shared by mobile + desktop menus.
  const downloadItems = (
    <>
      <DropdownMenuItem
        onClick={() => handleGenerateImage("top10")}
        disabled={isGenerating || !rankingData}
      >
        <Download className="mr-2" size={16} />
        Top 10 — square
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => handleGenerateImage("full")}
        disabled={isGenerating || !rankingData}
      >
        <Download className="mr-2" size={16} />
        Full ranking
      </DropdownMenuItem>
    </>
  );

  // Mobile (Web Share API present): share opens the OS sheet; download is a
  // small menu offering the two image formats. Share is the magenta primary —
  // the completion moment is where the viral loop propagates.
  if (canNativeShare) {
    return (
      <div className="flex shrink-0 items-center gap-2.5">
        <Button
          size="icon"
          onClick={handleNativeShare}
          aria-label="Share"
          className="shrink-0"
        >
          <Share2 size={16} />
        </Button>
        {rankingData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="neutral"
                size="icon"
                disabled={isGenerating}
                aria-label="Download image"
                className="shrink-0"
              >
                <Download size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{downloadItems}</DropdownMenuContent>
          </DropdownMenu>
        )}
        {dialog}
      </div>
    );
  }

  // Desktop: copy-link + the two image options behind one magenta trigger.
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={size}>
            <Share2 size={16} />
            <span className="ml-2">Share</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyLink}>
            <Link2 className="mr-2" size={16} />
            Copy Link
          </DropdownMenuItem>
          {downloadItems}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog}
    </>
  );
}
