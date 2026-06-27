import { useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface RankingImageData {
  sorterTitle: string;
  username: string;
  rankings: RankedItem[];
  createdAt: Date;
  selectedTags?: string[];
}

type Variant = "top10" | "full";

export function useDownloadRankingImage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadImage = useCallback(
    async (data: RankingImageData, variant: Variant = "top10") => {
      if (isGenerating) return;
      setIsGenerating(true);

      // Immediate acknowledgment — rasterizing takes a few seconds, especially
      // on phones, so reassure the user the tap registered.
      const toastId = toast.loading("Generating image…");

      try {
        // Off-screen container to render the share card into.
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "-9999px";
        container.style.left = "-9999px";
        container.style.zIndex = "-1";
        document.body.appendChild(container);

        const { ResultShareImage, ResultShareImageFull } = await import(
          "@/components/result-share-image"
        );
        const React = await import("react");
        const ReactDOM = await import("react-dom/client");

        const handle =
          data.username && data.username !== "Anonymous"
            ? `@${data.username}`
            : "@anon";
        const subtitle = `Sorted by ${handle}`;

        // Top-10 uses 10 items; full uses all of them.
        const allItems = data.rankings.map((r) => ({
          id: r.id,
          name: r.title,
          imageUrl: r.imageUrl,
        }));
        const items =
          variant === "full" ? allItems : allItems.slice(0, 10);

        const element = React.createElement(
          variant === "full" ? ResultShareImageFull : ResultShareImage,
          { title: data.sorterTitle, subtitle, items },
        );

        const root = ReactDOM.createRoot(container);
        root.render(element);

        // Let React commit.
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Ensure fonts are loaded before rasterizing, or text falls back to the
        // wrong family. next/font names families with a hash, so the card uses
        // the --font-* CSS vars (inherited from <body>); we just wait for all
        // document fonts to be ready rather than probing specific names.
        await document.fonts.ready;

        // Wait for any item photos used as tile backgrounds. They're CSS
        // background-images, so create probe <img>s to know when they're ready.
        const imgUrls = data.rankings
          .slice(0, 10)
          .map((r) => r.imageUrl)
          .filter((u): u is string => !!u);
        if (imgUrls.length > 0) {
          await Promise.all(
            imgUrls.map(
              (url) =>
                new Promise((resolve) => {
                  const img = new Image();
                  img.crossOrigin = "anonymous";
                  img.onload = () => resolve(void 0);
                  img.onerror = () => resolve(void 0);
                  img.src = url;
                }),
            ),
          );
        }

        // Settle.
        await new Promise((resolve) => setTimeout(resolve, 150));

        const cardId =
          variant === "full" ? "#sortr-result-card-full" : "#sortr-result-card";
        const card = container.querySelector(cardId) as HTMLElement | null;
        if (!card) throw new Error("Could not find result card");

        const dataUrl = await toPng(card, {
          pixelRatio: 2,
          cacheBust: true,
        });

        const sanitizedTitle = data.sorterTitle
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase()
          .substring(0, 50);
        const filename =
          variant === "full"
            ? `${sanitizedTitle}-full-ranking.png`
            : `${sanitizedTitle}-top10.png`;

        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        root.unmount();
        document.body.removeChild(container);

        track("image_downloaded", {
          sorterTitle: data.sorterTitle,
          variant,
        });
        toast.success("Image downloaded!", { id: toastId });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error("Error generating ranking image:", message, error);
        toast.error("Failed to generate image. Please try again.", {
          id: toastId,
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating],
  );

  return { downloadImage, isGenerating };
}
