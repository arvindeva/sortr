"use client";

import { useEffect, useRef } from "react";

/**
 * Homepage-only backdrop: huge, barely-there outlines of rounded squares — the
 * logo's two-squares geometry (magenta + cyan only) blown up to room scale.
 * Fixed at -z-10: positioned z-0 boxes paint ABOVE sibling text (plain text
 * sits in a lower paint layer), so the backdrop must be negative-z to sit
 * behind everything. Intentionally NOT the old atmosphere — no glows, no grid.
 *
 * Uses the -ink tokens: identical to the fills on dark, deepened on light
 * (raw magenta/cyan are near-invisible on white). Light alphas run ~+.10 over
 * dark for equal perceptual weight.
 *
 * Two separate square sets: nine room-scale squares for md+ and five much
 * smaller ones for mobile (the desktop sizes swallowed half a phone screen).
 *
 * Motion (both skipped under prefers-reduced-motion):
 * - pulse: sortrBackdropPulse opacity breath (~5.5s), staggered per square so
 *   they never sync. Peak brightness lives in the border alphas; the deep
 *   trough (0.35) keeps the resting look quiet.
 * - parallax: each square drifts on scroll at its own rate, mixed directions.
 *   Transforms via rAF; opacity and transform don't conflict.
 */

// Per-square parallax factors (fraction of scrollY), matching DOM order:
// nine desktop squares, then five mobile squares. Mixed signs — some sink
// with the scroll, some rise against it, so the field gently pulls apart.
const PARALLAX = [
  0.05, -0.04, -0.1, 0.09, 0.13, -0.09, -0.14, 0.2, -0.17, // desktop
  0.06, -0.08, 0.12, -0.05, 0.1, // mobile
];

const PULSE = "motion-safe:animate-[sortrBackdropPulse_5.5s_ease-in-out_infinite]";

export function HomeBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(ref.current?.children ?? []) as HTMLElement[];
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        els.forEach((el, i) => {
          el.style.transform = `translate3d(0, ${(y * PARALLAX[i]).toFixed(1)}px, 0)`;
        });
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* ---- desktop set (md and up) ---- */}
      <div
        className={`border-main-ink/[.40] dark:border-main-ink/[.26] absolute -top-24 -right-28 hidden size-[340px] rounded-[22px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "0s" }}
      />
      <div
        className={`border-cyan-ink/[.36] dark:border-cyan-ink/[.22] absolute -bottom-16 -left-20 hidden size-[220px] rounded-[18px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-2.7s" }}
      />
      <div
        className={`border-cyan-ink/[.35] dark:border-cyan-ink/[.20] absolute top-[13%] left-[12%] hidden size-28 rounded-[12px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-1.1s" }}
      />
      <div
        className={`border-cyan-ink/[.38] dark:border-cyan-ink/[.23] absolute top-[52%] -right-12 hidden size-40 rounded-[14px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-3.8s" }}
      />
      <div
        className={`border-main-ink/[.35] dark:border-main-ink/[.20] absolute top-[44%] left-[6%] hidden size-20 rounded-[10px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-1.9s" }}
      />
      <div
        className={`border-main-ink/[.32] dark:border-main-ink/[.19] absolute right-[16%] -bottom-8 hidden size-24 rounded-[11px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-4.6s" }}
      />
      <div
        className={`border-cyan-ink/[.29] dark:border-cyan-ink/[.17] absolute top-[28%] right-[31%] hidden size-32 rounded-[13px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-0.6s" }}
      />
      <div
        className={`border-main-ink/[.32] dark:border-main-ink/[.19] absolute top-[21%] left-[29%] hidden size-14 rounded-[8px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-3.2s" }}
      />
      <div
        className={`border-main-ink/[.26] dark:border-main-ink/[.16] absolute top-[60%] left-[44%] hidden size-16 rounded-[9px] border-[2.5px] md:block ${PULSE}`}
        style={{ animationDelay: "-5s" }}
      />
      {/* ---- mobile set (below md): much smaller, hugging the edges ---- */}
      <div
        className={`border-main-ink/[.40] dark:border-main-ink/[.26] absolute -top-8 -right-10 size-24 rounded-[12px] border-[2.5px] md:hidden ${PULSE}`}
        style={{ animationDelay: "-0.9s" }}
      />
      <div
        className={`border-cyan-ink/[.36] dark:border-cyan-ink/[.22] absolute top-[36%] -left-7 size-16 rounded-[9px] border-[2.5px] md:hidden ${PULSE}`}
        style={{ animationDelay: "-2.2s" }}
      />
      <div
        className={`border-main-ink/[.32] dark:border-main-ink/[.19] absolute top-[15%] left-[9%] size-10 rounded-[6px] border-[2.5px] md:hidden ${PULSE}`}
        style={{ animationDelay: "-3.5s" }}
      />
      <div
        className={`border-cyan-ink/[.35] dark:border-cyan-ink/[.20] absolute -right-6 -bottom-5 size-20 rounded-[10px] border-[2.5px] md:hidden ${PULSE}`}
        style={{ animationDelay: "-4.9s" }}
      />
      <div
        className={`border-cyan-ink/[.29] dark:border-cyan-ink/[.17] absolute bottom-[24%] left-[12%] size-12 rounded-[7px] border-[2.5px] md:hidden ${PULSE}`}
        style={{ animationDelay: "-1.6s" }}
      />
    </div>
  );
}
