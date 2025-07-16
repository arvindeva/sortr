"use client";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SignInContent() {
  const params = useSearchParams();
  const error = params.get("error");
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim()) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    await signIn("email", { email, callbackUrl: "/" });
    setIsLoading(false);
  };

  // Customize which errors show. Only show real errors, not old/false ones.
  let errorMessage = null;
  if (error === "EmailSignin") {
    errorMessage =
      "Sorry, we couldn't send the magic link. Please check your email or try again later.";
  } else if (error === "OAuthAccountNotLinked") {
    errorMessage = "This email is already linked to a different provider.";
  }
  // Add other error codes as needed: https://next-auth.js.org/configuration/pages#error-codes

  if (session?.user) {
    return (
      <div className="mt-20 flex flex-col items-center">
        <p className="mb-4">
          You are already signed in as <strong>{session.user.email}</strong>
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Go to home
        </a>
      </div>
    );
  }

  return (
    <div className="mt-20 flex flex-col items-center">
      <h1 className="mb-6 text-3xl font-bold">Sign In to Sortr</h1>
      {errorMessage && (
        <div className="mb-4 rounded border border-red-300 bg-red-100 p-4 text-red-700">
          {errorMessage}
        </div>
      )}
      <div className="w-full max-w-md space-y-4">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
          className="w-full"
          required
        />
        <Button
          onClick={handleSignIn}
          disabled={!email.trim() || isLoading}
          className="w-full"
        >
          {isLoading ? "Sending..." : "Sign in with Email"}
        </Button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-20 flex items-center justify-center">Loading...</div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
