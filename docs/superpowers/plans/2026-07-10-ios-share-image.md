# iOS Share-Image Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken-on-iOS `<a download>` image delivery with a preview dialog offering the OS share sheet (`navigator.share` with files), a download button, and long-press-to-save — plus the magenta restyle of the share trigger.

**Architecture:** The existing client-side rasterization (`html-to-image` on an off-screen render of `ResultShareImage`) is kept verbatim; only the delivery tail changes. A reworked hook returns `{ blob, filename }` instead of downloading; a new `ShareImageDialog` shows the PNG as a real `<img>` (long-pressable on iOS) with Share/Download actions; `ShareButton` wires them together and gets the magenta primary treatment.

**Tech Stack:** Next.js 15 App Router, React 19 client components, `html-to-image` (`toBlob`), Radix dialog primitive (`src/components/ui/dialog.tsx`), `sonner` toasts, Umami `track()`.

**Spec:** `docs/superpowers/specs/2026-07-08-ios-share-image-design.md`

## Global Constraints

- No test infra exists in this repo (Vitest deferred by owner) and this feature is browser-API behavior — tasks verify via `npx tsc --noEmit` + a dev-server smoke check; final device verification is a manual checklist run by the owner (desktop + iPhone + Android).
- `navigator.share({ files })` MUST be called synchronously inside the button's click handler (no `await` before it) — Safari rejects it outside a user gesture.
- The preview MUST be a plain `<img>` element with nothing overlaying it (no background-image, no `pointer-events-none` wrappers) so iOS long-press offers "Add to Photos".
- Design system: magenta primary = Button `variant="default"`; secondary = `variant="neutral"`; mono/HUD text = `hud` class or `font-mono`; copy is lowercase-plain, game-flavored.
- Analytics event name stays `image_downloaded` (already in the `EventName` union — no analytics.ts change); it gains `method: "share-sheet" | "download"` in the data payload and keeps `sorterTitle` and `variant`.
- All work on the `development` branch, committed per task with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `ShareImageDialog` component

**Files:**
- Create: `src/components/share-image-dialog.tsx`

**Interfaces:**
- Consumes: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` from `@/components/ui/dialog`; `Button` from `@/components/ui/button`; `track` from `@/lib/analytics`.
- Produces: `ShareImageDialog` component with props `{ open: boolean; onOpenChange: (open: boolean) => void; blob: Blob | null; filename: string; title: string; variant: "top10" | "full" }` — Task 3 renders it from `ShareButton`.

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (pre-existing errors, if any, are unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/components/share-image-dialog.tsx
git commit -m "Add ShareImageDialog: preview + share-sheet/download delivery

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Rework the generation hook to generate-and-return

**Files:**
- Create: `src/hooks/use-ranking-image.ts` (successor of `src/hooks/use-download-ranking-image.ts`, which Task 3 deletes)

**Interfaces:**
- Consumes: `toBlob` from `html-to-image`; `ResultShareImage`/`ResultShareImageFull` from `@/components/result-share-image` (dynamic import, unchanged); `toast` from `sonner`.
- Produces: `useRankingImage(): { generateImage, isGenerating }` where `generateImage(data: RankingImageData, variant: RankingImageVariant): Promise<GeneratedRankingImage | null>`; exported types `RankingImageData`, `RankingImageVariant = "top10" | "full"`, `GeneratedRankingImage = { blob: Blob; filename: string }`. Returns `null` on failure or re-entrancy (error toast already shown).

- [ ] **Step 1: Write the hook**

The body below is the existing `use-download-ranking-image.ts` pipeline with three changes: `toBlob` instead of `toPng`, the `<a download>` + success-toast + `track` tail removed (delivery/analytics move to the dialog), and the loading toast dismissed on success.

```ts
import { useState, useCallback } from "react";
import { toBlob } from "html-to-image";
import { toast } from "sonner";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

export interface RankingImageData {
  sorterTitle: string;
  username: string;
  rankings: RankedItem[];
  createdAt: Date;
  selectedTags?: string[];
}

export type RankingImageVariant = "top10" | "full";

export interface GeneratedRankingImage {
  blob: Blob;
  filename: string;
}

/**
 * Renders the ranking share card off-screen and rasterizes it to a PNG blob.
 * Generate-and-return only — showing/saving the image is the caller's job
 * (ShareImageDialog), because the delivery mechanism differs per platform.
 */
export function useRankingImage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateImage = useCallback(
    async (
      data: RankingImageData,
      variant: RankingImageVariant = "top10",
    ): Promise<GeneratedRankingImage | null> => {
      if (isGenerating) return null;
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
        const items = variant === "full" ? allItems : allItems.slice(0, 10);

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

        const blob = await toBlob(card, {
          pixelRatio: 2,
          cacheBust: true,
        });
        if (!blob) throw new Error("Rasterization produced no image");

        const sanitizedTitle = data.sorterTitle
          .replace(/[^a-z0-9]/gi, "-")
          .toLowerCase()
          .substring(0, 50);
        const filename =
          variant === "full"
            ? `${sanitizedTitle}-full-ranking.png`
            : `${sanitizedTitle}-top10.png`;

        root.unmount();
        document.body.removeChild(container);

        // No success toast — the preview dialog opening IS the feedback.
        toast.dismiss(toastId);
        return { blob, filename };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Error generating ranking image:", message, error);
        toast.error("Failed to generate image. Please try again.", {
          id: toastId,
        });
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating],
  );

  return { generateImage, isGenerating };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. (`use-download-ranking-image.ts` still exists and compiles; it's removed in Task 3.)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-ranking-image.ts
git commit -m "Add useRankingImage: generate-and-return ranking card blob

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Rewire `ShareButton` (dialog flow + magenta restyle), delete old hook

**Files:**
- Modify: `src/components/share-button.tsx` (full replacement below)
- Delete: `src/hooks/use-download-ranking-image.ts`

**Interfaces:**
- Consumes: `useRankingImage`, `GeneratedRankingImage`, `RankingImageVariant` from `@/hooks/use-ranking-image` (Task 2); `ShareImageDialog` from `@/components/share-image-dialog` (Task 1).
- Produces: same external `ShareButton` API as today (`size`, `hideTextOnMobile`, `rankingData`) — the only consumer `src/app/rankings/[id]/page.tsx:472` needs no change.

- [ ] **Step 1: Replace `share-button.tsx`**

Changes vs. current: download menu items now generate → open `ShareImageDialog`; the share trigger drops `variant="neutral"` to become the magenta primary (the roadmap quick-win); the download trigger stays neutral; dialog state (`generated` + `dialogOpen`) lives here and the dialog renders in both mobile/desktop branches.

```tsx
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
```

- [ ] **Step 2: Delete the old hook**

```bash
rm src/hooks/use-download-ranking-image.ts
```

- [ ] **Step 3: Type-check + confirm no stale imports**

Run: `npx tsc --noEmit && grep -rn "use-download-ranking-image" src/`
Expected: tsc clean; grep finds nothing.

- [ ] **Step 4: Commit**

```bash
git add -A src/components/share-button.tsx src/hooks/
git commit -m "ShareButton: preview dialog delivery + magenta share trigger

Fixes iOS image saving (two user reports): <a download> with a data URL
no-ops or lands in Files on iOS Safari. Images now open in a preview
dialog — long-press to save, OS share sheet with the PNG file (iOS
'Save Image' → Photos, direct share to socials), download for
desktop/Android.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Smoke-check in the running app, then owner device checklist

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything above, running at `http://localhost:3000/rankings/<id>` (get an id: `SELECT id FROM "sortingResults" ORDER BY "createdAt" DESC LIMIT 1` against the staging DB via the `.env` `DATABASE_URL`).

- [ ] **Step 1: Dev-server smoke check (agent-runnable)**

Run: `npm run dev` in the background, then confirm the rankings page renders with the new button markup:

```bash
curl -s http://localhost:3000/rankings/<id> | grep -c "Share"
```

Expected: ≥1 (page renders, no 500). Then stop the dev server.

- [ ] **Step 2: Desktop manual check (owner or agent with browser)**

- Share menu → "Top 10 — square" → loading toast → dialog opens with the correct preview image.
- "Download" inside the dialog saves the PNG; "Share image" button is absent (desktop has no file-share).
- Repeat with "Full ranking" — tall preview scrolls/fits, correct card.
- Open/close the dialog repeatedly — no console errors (object-URL lifecycle).

- [ ] **Step 3: iPhone + Android manual checklist (owner, staging or prod after deploy)**

- iPhone: "Share image" → OS sheet → **Save Image → lands in Photos** (the headline test).
- iPhone: long-press the preview → "Add to Photos" offered.
- iPhone: share direct to WhatsApp — the PNG attaches, not a URL.
- iPhone: cancel the share sheet — no error toast.
- Android Chrome: share sheet with file works; Download works.

- [ ] **Step 4: Mark the feature done**

No commit (no file changes). Report results; if any device check fails, file the failure back into a fix task before closing.
