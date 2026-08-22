"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * Global error boundary — replaces Next's unbranded "Application error: a
 * client-side exception has occurred" page (which users were meeting with sad
 * emoji in the feedback box and we were meeting with zero information).
 *
 * Two jobs:
 * 1. Report: fire a `client_error` event with the actual message/stack/URL so
 *    crashes are diagnosable from Umami instead of being invisible.
 * 2. Recover: "Clear saved progress & reload" wipes the sorting-progress-*
 *    localStorage keys — the one class of per-user state that can poison a
 *    page load persistently (corrupted/stale saved sorts).
 *
 * NOTE: this file replaces the root layout when it renders, so it must define
 * its own <html>/<body> and be fully self-contained: inline styles, hardcoded
 * brand colors (the design tokens/fonts from the layout don't exist here), no
 * imports that could themselves be part of a broken tree. Dark-only by design.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);

    const report = () =>
      track("client_error", {
        message: String(error?.message ?? "unknown").slice(0, 200),
        stack: String(error?.stack ?? "")
          .split("\n")
          .slice(1, 3)
          .join(" | ")
          .slice(0, 200),
        digest: error?.digest,
        url:
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : "",
        ua:
          typeof navigator !== "undefined"
            ? navigator.userAgent.slice(0, 150)
            : "",
      });

    // The Umami script loads independently of React, so it usually survives
    // the crash. Retry ONLY if it wasn't loaded yet on the first attempt — an
    // unconditional retry double-counted every crash (~2x inflation in the
    // first day's client_error data).
    const umamiLoaded = () =>
      typeof window !== "undefined" &&
      !!(window as unknown as { umami?: unknown }).umami;
    report();
    let retry: ReturnType<typeof setTimeout> | undefined;
    if (!umamiLoaded()) {
      retry = setTimeout(report, 2500);
    }
    return () => {
      if (retry) clearTimeout(retry);
    };
  }, [error]);

  const clearSavedAndReload = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("sorting-progress-"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // storage unavailable — reload anyway
    }
    window.location.reload();
  };

  const btn: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "13px 20px",
    borderRadius: 8,
    border: "none",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0918",
          color: "#f3f0ff",
          fontFamily:
            "system-ui, 'Segoe UI', Arial, sans-serif",
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
          {/* Brand mark — mirrors <SortrMark> (12px squares, 5px gap, 2px
              radius, alternating sortrGlow pulse) but self-contained: the
              layout's globals.css doesn't exist under global-error, so the
              keyframes are inlined. */}
          <style>{`@keyframes sortrGlowGE { 0%,100% { opacity:.5 } 50% { opacity:1 } }`}</style>
          <div
            style={{
              display: "flex",
              gap: 5,
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                background: "#ff2e7e",
                animation: "sortrGlowGE 1.6s infinite",
              }}
            />
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                border: "2px solid #19e3df",
                boxSizing: "border-box",
                animation: "sortrGlowGE 1.6s infinite",
                animationDelay: "-0.8s",
              }}
            />
          </div>

          <h1
            style={{
              fontFamily: "'Arial Narrow', 'Helvetica Neue', Arial, sans-serif",
              fontSize: 44,
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 0.95,
              margin: "0 0 12px",
              letterSpacing: "0.01em",
            }}
          >
            Oops..
          </h1>
          <p
            style={{
              color: "#a39ec2",
              fontSize: 15,
              lineHeight: 1.5,
              margin: "0 0 26px",
            }}
          >
            The page hit an error it couldn&apos;t recover from. A reload
            usually fixes it.
          </p>

          <button
            onClick={() => window.location.reload()}
            style={{
              ...btn,
              background: "linear-gradient(180deg,#ff2e7e,#e01e65)",
              color: "#fff",
              marginBottom: 10,
            }}
          >
            Reload page
          </button>
          <button
            onClick={clearSavedAndReload}
            style={{
              ...btn,
              background: "transparent",
              border: "1px solid rgba(243,240,255,.25)",
              color: "#f3f0ff",
              marginBottom: 6,
            }}
          >
            Clear saved progress &amp; reload
          </button>
          <p
            style={{
              color: "#6f6a86",
              fontSize: 12,
              margin: "0 0 22px",
            }}
          >
            If reloading loops back here, the second button clears locally
            saved sorting progress — the usual culprit.
          </p>

          <a
            href="/"
            style={{
              color: "#19e3df",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            ← back to home
          </a>
        </div>
      </body>
    </html>
  );
}
