"use client";

import { Share2, Link2, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useDownloadRankingImage } from "@/hooks/use-download-ranking-image";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface ShareButtonProps {
  size?: "sm" | "default" | "lg";
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
  rankingData,
}: ShareButtonProps) {
  const { downloadImage, isGenerating } = useDownloadRankingImage();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  const handleDownloadImage = async () => {
    if (!rankingData) {
      toast.error("Ranking data not available for download");
      return;
    }

    await downloadImage(rankingData);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="neutral" size={size}>
          <Share2 size={16} />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-secondary-background">
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="bg-secondary-background text-foreground"
        >
          <Link2 className="mr-2" size={16} />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDownloadImage}
          disabled={isGenerating || !rankingData}
          className="bg-secondary-background text-foreground"
        >
          <Download className="mr-2" size={16} />
          {isGenerating ? "Generating..." : "Download Image"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
