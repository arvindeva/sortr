"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { VsMarker } from "@/components/ui/sortr-mark";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");

  let message = "An unknown error occurred. Please try again.";

  // Customize messages for common NextAuth errors:
  if (error === "EmailSignin") {
    message =
      "Sorry, we couldn't send you a magic link. Please check your email address or try again later.";
  } else if (error === "OAuthAccountNotLinked") {
    message =
      "This email is already linked to another sign-in method. Please use the correct provider.";
  } else if (error === "Verification") {
    message = "The sign-in link is no longer valid. Please request a new one.";
  }
  // See: https://next-auth.js.org/configuration/pages#error-codes

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-[440px] text-center">
        <div className="mb-6 flex justify-center">
          <VsMarker size={56} glyph="!" />
        </div>

        <h1 className="display text-[clamp(2.25rem,6vw,3rem)] font-black text-foreground">
          Sign in error
        </h1>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <p className="text-muted-foreground">{message}</p>
        </div>

        <div className="mt-6">
          <Button asChild arcade size="lg" className="w-full">
            <Link href="/auth/signin">Return to sign in &rarr;</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <p className="hud text-xs text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
