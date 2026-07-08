# iOS share-image fix + magenta share buttons — design spec

**Status:** Approved (brainstormed Jul 8 2026). Implement on `development`, verify on desktop + iPhone.
**Driver:** Two user reports in two days: the ranking-image download does nothing (or lands in Files, not Photos) on iPhone. Root cause: the flow rasterizes the card client-side, then delivers it via `<a download>` with a data URL — the worst-supported mechanism on iOS Safari. Bundled in: the roadmap quick-win of making the share actions magenta at the completion moment (the result page is where the viral loop propagates).

## Decisions (settled)

1. **Approach A — keep client-side generation, change delivery.** The `html-to-image` off-screen rasterization stays as-is. Only the tail changes: instead of auto-downloading, show the generated PNG in a preview dialog. (Rejected: B — server-rendered share image via satori endpoint: robust but re-implements the card design in satori's CSS subset + per-render server cost; keep as a "someday" upgrade. C — UA-sniff iOS only: browser sniffing, two paths, no share-sheet upgrade.)
2. **Same dialog everywhere** — desktop gets the preview modal too (Download button inside). One code path; users see what they're saving.
3. **Bundle the magenta restyle** of the share trigger (roadmap quick-win) since we're rebuilding `ShareButton` anyway.

## Current state (verified)

- `src/hooks/use-download-ranking-image.ts` — renders `ResultShareImage`/`ResultShareImageFull` into an off-screen container, `toPng` (data URL), then `<a download>` click. Toast for progress/success/error. iOS: `a[download]` + data URL frequently no-ops; when it works it saves to Files, not Photos.
- `src/components/share-button.tsx` — single consumer surface, used only on `src/app/rankings/[id]/page.tsx` (line ~472). Mobile (Web Share API present): neutral icon buttons — share (URL only) + download dropdown (Top 10 / Full). Desktop: one neutral "Share" dropdown (copy link + the two downloads).
- `src/components/ui/dialog.tsx` — existing Radix dialog primitive to build on.
- Analytics: `track("share_clicked", {method})`, `track("image_downloaded", {variant})`.

## Changes

### 1. Hook: generate-and-return (rename file to `use-ranking-image.ts`)

- The hook becomes `useRankingImage` with `generateImage(data, variant)` returning `{ blob, filename }` instead of triggering a download (file renamed from `use-download-ranking-image.ts`; single consumer). Use html-to-image's `toBlob` (not `toPng`) — same renderer, no giant data-URL string in memory on phones.
- Keep: off-screen render, font/image readiness waits, `pixelRatio: 2`, loading toast, error toast on failure, `isGenerating` guard.
- On success the loading toast is dismissed (no success toast — the dialog opening IS the feedback). On failure the dialog never opens (existing error toast covers it).

### 2. New component: `ShareImageDialog` (`src/components/share-image-dialog.tsx`)

Props: `open`, `onOpenChange`, `blob`, `filename`, `title` (sorter title, for the share-sheet payload).

Contents (VERSUS system: deep panel bg, mono hint text):
- The PNG as a plain `<img src={objectUrl}>` — `object-contain`, max height ~60vh, rounded border. A real `<img>` (not background-image), nothing overlaying it, so iOS long-press → "Add to Photos" works.
- **Share image** — magenta arcade primary, rendered only when `navigator.canShare?.({ files: [file] })` is true (iOS Safari 15+, Android Chrome). onClick calls `navigator.share({ files: [new File([blob], filename, { type: "image/png" })], title })` synchronously in the tap gesture (file already in memory — no transient-activation issue). On iOS the sheet includes "Save Image" (straight to Photos) plus direct share to Twitter/IG/WhatsApp. Rejection (user cancelled) is a silent no-op.
- **Download** — `<a download>` with the object URL (works on desktop + Android; on iOS it goes to Files, acceptable as the secondary path). Secondary style normally; becomes the primary style when the share button isn't shown (desktop).
- Hint line, mono/muted, shown only on touch devices (`pointer: coarse`): "press and hold the image to save it to your photos".
- Lifecycle: create the object URL when the dialog opens, `URL.revokeObjectURL` on close.

### 3. `ShareButton` rework (`share-button.tsx`)

- Flow unchanged: link-share button + download menu (Top 10 — square / Full ranking). Picking a variant now: generate → open `ShareImageDialog` with the result.
- Restyle (the quick-win): the share trigger becomes the magenta arcade primary so it pops at the completion moment; the download trigger stays secondary/neutral.
- Analytics: keep `share_clicked` as-is; `image_downloaded` gains `method: "share-sheet" | "download"` fired from the dialog's buttons (share-sheet fires only after `navigator.share` resolves).

## Not changing

- The share-card designs (`result-share-image.tsx`), the two variants, the rasterization pipeline.
- The URL share button behavior (native share sheet with the page URL).
- OG images, the rankings page itself beyond the button area.

## Verification (manual — this is all browser-API behavior)

- **Desktop (dev):** menu → variant → dialog opens with correct preview; Download saves the PNG; Share button absent; object URL revoked on close (no console warnings on repeated opens).
- **iPhone (staging or prod):** Share image → OS sheet → "Save Image" lands in Photos; direct-share to WhatsApp attaches the PNG; long-press on the preview offers "Add to Photos"; cancelling the sheet doesn't error-toast.
- **Android Chrome:** share sheet with file works; Download works.
- Both variants (Top 10 / Full) render correctly in the dialog.

## Rollback

Revert the commit — no schema, no API, one page affected (`/rankings/[id]`).
