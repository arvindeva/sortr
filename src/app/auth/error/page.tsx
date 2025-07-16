"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

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
    <div className="mt-24 flex flex-col items-center">
      <div className="bg-destructive/10 border-destructive/20 w-full max-w-md rounded-xl border p-8 text-center">
        <h1 className="text-destructive mb-3 text-2xl font-bold">
          Sign in Error
        </h1>
        <p className="text-destructive mb-4">{message}</p>
        <Link href="/auth/signin" className="text-blue-600 hover:underline">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-24 flex items-center justify-center">Loading...</div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
