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
        message = "Sorry, we couldn't send you a magic link. Please check your email address or try again later.";
    } else if (error === "OAuthAccountNotLinked") {
        message = "This email is already linked to another sign-in method. Please use the correct provider.";
    } else if (error === "Verification") {
        message = "The sign-in link is no longer valid. Please request a new one.";
    }
    // See: https://next-auth.js.org/configuration/pages#error-codes

    return (
        <div className="flex flex-col items-center mt-24">
            <div className="p-8 bg-destructive/10 rounded-xl border border-destructive/20 max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-3 text-destructive">Sign in Error</h1>
                <p className="mb-4 text-destructive">{message}</p>
                <Link href="/auth/signin" className="text-blue-600 hover:underline">
                    Return to Sign In
                </Link>
            </div>
        </div>
    );
}

export default function AuthErrorPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center mt-24">Loading...</div>}>
            <ErrorContent />
        </Suspense>
    );
}
