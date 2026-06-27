"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MAX_LEN = 2000;

/**
 * Feedback modal. Renders a trigger (passed as children) + the dialog. Message
 * is required; email optional. Posts to /api/feedback. Used from the footer and
 * the mobile menu.
 */
export function FeedbackModal({
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: {
  /** Trigger element (uncontrolled mode — footer). */
  children?: React.ReactNode;
  /** Controlled open state (mobile menu opens it via state). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;

  const [status, setStatus] = useState<"form" | "success">("form");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStatus("form");
    setMessage("");
    setEmail("");
    setError(false);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (controlled) onOpenChangeProp?.(next);
    else setOpenState(next);
    if (!next) {
      // Reset after the close animation so it doesn't flicker mid-transition.
      setTimeout(reset, 200);
    }
  };

  const submit = async () => {
    if (!message.trim()) {
      setError(true);
      return;
    }
    setSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim().slice(0, MAX_LEN),
          email: email.trim() || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      // Treat any response as success from the user's POV — we don't want to
      // block them on a transient error for a fire-and-forget note.
      setStatus("success");
    } catch {
      setStatus("success");
    } finally {
      setSubmitting(false);
    }
  };

  const successNote = email.trim()
    ? `Got it — we'll reply to ${email.trim()} if we need to.`
    : "Got it. Every note makes sortr sharper.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        className="max-w-[460px] border-main/40 p-7"
        style={{
          background:
            "linear-gradient(180deg, rgba(22,18,46,.96), rgba(12,10,28,.98))",
          boxShadow:
            "0 0 60px rgba(255,46,126,.18), 0 30px 80px rgba(0,0,0,.6)",
        }}
      >
        {status === "form" ? (
          <div>
            <DialogTitle className="display text-foreground text-[34px] leading-[0.92] font-black uppercase">
              Send feedback
            </DialogTitle>
            <p className="mt-2 mb-5 text-sm text-muted-foreground">
              Found a bug or have an idea? Tell us.
            </p>

            <label className="hud mb-2 block text-[11px] text-secondary-foreground/70">
              Message <span className="text-main-ink">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(false);
              }}
              placeholder="what's on your mind…"
              rows={4}
              maxLength={MAX_LEN}
              className={`min-h-[104px] w-full resize-y rounded-[10px] border bg-foreground/[0.05] px-3.5 py-3 text-[15px] leading-relaxed text-foreground outline-none transition-colors focus:border-main ${
                error ? "border-[#ff5a86]" : "border-border"
              }`}
            />
            {error && (
              <div className="mt-1.5 font-mono text-[11px] text-[#ff5a86]">
                ↳ add a message before sending
              </div>
            )}

            <label className="hud mt-[18px] mb-2 block text-[11px] text-secondary-foreground/70">
              Email{" "}
              <span className="font-mono text-[11px] tracking-normal normal-case text-secondary-foreground/70">
                — only if you want a reply
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[10px] border border-border bg-foreground/[0.05] px-3.5 py-3 text-[15px] text-foreground outline-none transition-colors focus:border-main"
            />

            <button
              onClick={submit}
              disabled={submitting}
              style={{ background: "var(--main-gradient)" }}
              className="mt-[22px] w-full rounded-[10px] py-3.5 shadow-[0_10px_30px_rgba(255,46,126,.35)] transition-shadow hover:shadow-[0_12px_36px_rgba(255,46,126,.5)] disabled:opacity-60"
            >
              <span className="display text-[21px] font-extrabold tracking-wide uppercase text-white">
                {submitting ? "Sending…" : "Send it →"}
              </span>
            </button>
          </div>
        ) : (
          <div className="px-1.5 pt-4.5 pb-2 text-center">
            <div className="animate-[sortrPop_0.45s_cubic-bezier(.2,.9,.3,1)] text-[54px] leading-none">
              🎉
            </div>
            <DialogTitle className="display text-foreground mt-5 text-[38px] leading-[0.92] font-black uppercase">
              Thanks!
            </DialogTitle>
            <p className="mt-2.5 mb-6 text-sm text-muted-foreground">
              {successNote}
            </p>
            <button
              onClick={() => handleOpenChange(false)}
              className="hud rounded-lg border border-border px-5.5 py-2.5 text-[12px] text-foreground transition-colors hover:border-main/50"
            >
              Done
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
