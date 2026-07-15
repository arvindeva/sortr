/**
 * Homepage-only backdrop: huge, barely-there outlines of rounded squares — the
 * logo's two-squares geometry (magenta + cyan only) blown up to room scale.
 * Fixed behind the content (the layout's content wrapper is z-10);
 * intentionally NOT the old atmosphere layer — no glows, no grid.
 *
 * Uses the -ink tokens: identical to the fills on dark, deepened on light
 * (raw magenta/cyan are near-invisible on white). Light alphas run ~+.10 over
 * dark for equal perceptual weight. Mobile shows only the two big corner
 * squares — the mid/center ones clash with content on narrow screens.
 */
export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* the two corner anchors — visible at every breakpoint */}
      <div className="border-main-ink/[.28] dark:border-main-ink/[.18] absolute -top-24 -right-28 size-[340px] rounded-[22px] border-2" />
      <div className="border-cyan-ink/[.25] dark:border-cyan-ink/[.15] absolute -bottom-16 -left-20 size-[220px] rounded-[18px] border-2" />
      {/* edge squares — md and up */}
      <div className="border-cyan-ink/[.24] dark:border-cyan-ink/[.14] absolute top-[13%] left-[12%] hidden size-28 rounded-[12px] border-2 md:block" />
      <div className="border-cyan-ink/[.26] dark:border-cyan-ink/[.16] absolute top-[52%] -right-12 hidden size-40 rounded-[14px] border-2 md:block" />
      <div className="border-main-ink/[.24] dark:border-main-ink/[.14] absolute top-[44%] left-[6%] hidden size-20 rounded-[10px] border-2 md:block" />
      <div className="border-main-ink/[.22] dark:border-main-ink/[.13] absolute right-[16%] -bottom-8 hidden size-24 rounded-[11px] border-2 md:block" />
      {/* center-area squares — lower alpha since content sits over them */}
      <div className="border-cyan-ink/[.20] dark:border-cyan-ink/[.12] absolute top-[28%] right-[31%] hidden size-32 rounded-[13px] border-2 md:block" />
      <div className="border-main-ink/[.22] dark:border-main-ink/[.13] absolute top-[21%] left-[29%] hidden size-14 rounded-[8px] border-2 md:block" />
      <div className="border-main-ink/[.18] dark:border-main-ink/[.11] absolute top-[60%] left-[44%] hidden size-16 rounded-[9px] border-2 md:block" />
    </div>
  );
}
