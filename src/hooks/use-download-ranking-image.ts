import { useState, useCallback } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

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

export function useDownloadRankingImage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadImage = useCallback(
    async (data: RankingImageData) => {
      if (isGenerating) return;

      setIsGenerating(true);

      try {
        // Create temporary container for the image layout
        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.top = "-9999px";
        container.style.left = "-9999px";
        container.style.zIndex = "-1";
        // Copy the body's font family class to ensure font variables work
        container.className = document.body.className;

        // Import the RankingImageLayout component dynamically
        const { RankingImageLayout } = await import(
          "@/components/ranking-image-layout"
        );
        const React = await import("react");
        const ReactDOM = await import("react-dom/client");

        // Create React element
        const rankingElement = React.createElement(RankingImageLayout, {
          sorterTitle: data.sorterTitle,
          username: data.username,
          rankings: data.rankings,
          createdAt: data.createdAt,
          selectedTags: data.selectedTags,
        });

        // Append container to body
        document.body.appendChild(container);

        // Create React root and render
        const root = ReactDOM.createRoot(container);
        root.render(rankingElement);

        // Wait for the next tick to ensure rendering is complete
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Wait for fonts to be ready - specifically check for Poppins
        await document.fonts.ready;

        // Additional check to ensure Poppins is loaded
        try {
          await document.fonts.load('400 16px "Poppins"');
          await document.fonts.load('500 16px "Poppins"');
          await document.fonts.load('600 16px "Poppins"');
          await document.fonts.load('700 16px "Poppins"');
          await document.fonts.load('800 16px "Poppins"');
        } catch (error) {
          console.warn("Failed to load Poppins font weights:", error);
        }

        // Wait for all images to load
        const images = container.querySelectorAll("img");
        if (images.length > 0) {
          await Promise.all(
            Array.from(images).map(
              (img) =>
                new Promise((resolve) => {
                  if (img.complete) {
                    resolve(void 0);
                  } else {
                    img.onload = () => resolve(void 0);
                    img.onerror = () => resolve(void 0); // Continue even if image fails
                  }
                }),
            ),
          );
        }

        // Additional wait to ensure everything is rendered
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Find the actual ranking container inside our React component
        const rankingContainer = container.querySelector(
          ".ranking-image-container",
        );
        if (!rankingContainer) {
          throw new Error("Could not find ranking container");
        }

        // Generate PNG at actual rendered width for crisp output
        const containerEl = rankingContainer as HTMLElement;
        const rect = containerEl.getBoundingClientRect();
        const renderedWidth = Math.max(1, Math.ceil(rect.width));
        const MAX_CANVAS_EDGE = 8192; // guard against oversized canvases causing errors
        let desiredPixelRatio = 2;
        if (renderedWidth * desiredPixelRatio > MAX_CANVAS_EDGE) {
          desiredPixelRatio = Math.max(1, Math.floor(MAX_CANVAS_EDGE / renderedWidth));
        }

        const dataUrl = await toPng(containerEl, {
          quality: 1.0,
          pixelRatio: desiredPixelRatio,
          backgroundColor: "transparent", // Transparent background so rounded corners show
          width: renderedWidth,
          height: undefined, // Auto height based on content
          cacheBust: true,
          style: {
            fontFamily:
              'var(--font-poppins), "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          },
        });

        // Create filename
        const sanitizedTitle = data.sorterTitle
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase()
          .substring(0, 50);
        const sanitizedUsername = data.username
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase();
        const filename = `${sanitizedTitle}-rankings-${sanitizedUsername}.png`;

        // Download the image
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Cleanup
        root.unmount();
        document.body.removeChild(container);

        toast.success("Rankings image downloaded!");
      } catch (error: any) {
        // Provide more context to help diagnose issues like CORS or canvas size limits
        const message = error?.message || error?.toString?.() || "Unknown error";
        console.error("Error generating ranking image:", message, error);
        toast.error("Failed to generate image. Try again or reduce columns.");
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating],
  );

  return {
    downloadImage,
    isGenerating,
  };
}
