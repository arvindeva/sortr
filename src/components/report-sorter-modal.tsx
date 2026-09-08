"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { REPORT_REASONS, type ReportReason } from "@/lib/report-reasons";

const MAX_DETAILS_LEN = 2000;

/**
 * Report-a-sorter modal. Renders a trigger (passed as children) + the dialog.
 * Reason is required; details and email optional. Posts to /api/reports and
 * always shows the receipt state — the removal itself is the real reply.
 */
export function ReportSorterModal({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"form" | "success">("form");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStatus("form");
    setReason(null);
    setDetails("");
    setEmail("");
    setError(false);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset after the close animation so it doesn't flicker mid-transition.
      setTimeout(reset, 200);
    }
  };

  const submit = async () => {
    if (!reason) {
      setError(true);
      return;
    }
    setSubmitting(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          reason,
          details: details.trim().slice(0, MAX_DETAILS_LEN) || undefined,
          email: email.trim() || undefined,
        }),
      });
      // Treat any response as success from the reporter's POV — same
      // fire-and-forget stance as feedback.
      setStatus("success");
    } catch {
      setStatus("success");
    } finally {
      setSubmitting(false);
    }
  };

  const successNote = email.trim()
    ? `Got it — we'll review this and reply to ${email.trim()} if we need to.`
    : "Got it — we've received this and will review it.";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
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
              Report sorter
            </DialogTitle>
            <p className="mt-2 mb-5 text-sm text-muted-foreground">
              Breaks the{" "}
              <Link
                href="/content-policy"
                className="border-b border-cyan/40 text-cyan-ink transition-colors hover:border-main/50 hover:text-main-ink"
              >
                content policy
              </Link>
              ? Tell us what&apos;s wrong.
            </p>

            <label className="hud mb-2 block text-[11px] text-secondary-foreground/70">
              Reason <span className="text-main-ink">*</span>
            </label>
            <div className="flex flex-col gap-1.5">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => {
                    setReason(r.value);
                    setError(false);
                  }}
                  className={`rounded-[10px] border px-3.5 py-2.5 text-left text-[14px] transition-colors ${
                    reason === r.value
                      ? "border-main bg-main/10 text-foreground"
                      : "border-border bg-foreground/[0.05] text-muted-foreground hover:border-main/40"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {error && (
              <div className="mt-1.5 font-mono text-[11px] text-[#ff5a86]">
                ↳ pick a reason before sending
              </div>
            )}

            <label className="hud mt-[18px] mb-2 block text-[11px] text-secondary-foreground/70">
              Details{" "}
              <span className="font-mono text-[11px] tracking-normal normal-case text-secondary-foreground/70">
                — optional, but helps us act faster
              </span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="what should we look at…"
              rows={3}
              maxLength={MAX_DETAILS_LEN}
              className="min-h-[80px] w-full resize-y rounded-[10px] border border-border bg-foreground/[0.05] px-3.5 py-3 text-[15px] leading-relaxed text-foreground outline-none transition-colors focus:border-main"
            />

            <label className="hud mt-[18px] mb-2 block text-[11px] text-secondary-foreground/70">
              Email{" "}
              <span className="font-mono text-[11px] tracking-normal normal-case text-secondary-foreground/70">
                — only if you want to hear back
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
              className="mt-[22px] w-full rounded-[10px] py-3.5 disabled:opacity-60"
            >
              <span className="display text-[21px] font-extrabold tracking-wide uppercase text-white">
                {submitting ? "Sending…" : "Send report →"}
              </span>
            </button>
          </div>
        ) : (
          <div className="px-1.5 pt-4.5 pb-2 text-center">
            <DialogTitle className="display text-foreground mt-5 text-[38px] leading-[0.92] font-black uppercase">
              Thanks
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

/**
 * The default trigger: a quiet flag link for the bottom of the sorter page.
 */
export function ReportSorterLink({ slug }: { slug: string }) {
  return (
    <div className="mt-10 flex justify-end">
      <ReportSorterModal slug={slug}>
        <button className="hud text-[11px] text-muted-foreground/70 transition-colors hover:text-main-ink">
          ⚑ Report this sorter
        </button>
      </ReportSorterModal>
    </div>
  );
}
