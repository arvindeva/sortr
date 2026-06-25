"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VsMarker } from "@/components/ui/sortr-mark";

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-[440px] text-center">
        <div className="mb-6 flex justify-center">
          <VsMarker size={56} glyph="✓" glyphColor="var(--cyan)" />
        </div>

        <h1 className="display text-[clamp(2.25rem,6vw,3rem)] font-black text-foreground">
          Check your email
        </h1>
        <p className="mt-3 text-muted-foreground">
          We&apos;ve sent you a magic link to sign in &mdash; no password
          needed.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          {email ? (
            <p className="text-muted-foreground">
              Open the link we sent to{" "}
              <strong className="text-foreground">{email}</strong> to continue.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Open the link we sent to your inbox to continue.
            </p>
          )}
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            no email? check your spam folder or try again.
          </p>
        </div>

        <div className="mt-6">
          <Button asChild variant="neutral" size="lg" className="w-full">
            <Link href="/auth/signin">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <p className="hud text-xs text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <VerifyRequestContent />
    </Suspense>
  );
}
