"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="mt-20 flex flex-col items-center">
      <div className="mb-6 rounded-full bg-white p-4 dark:bg-secondary-background">
        <Mail className="h-8 w-8 text-red-500 dark:text-red-400" />
      </div>
      
      <h1 className="mb-4 text-3xl font-bold">Check your email</h1>
      
      <div className="mb-8 max-w-md text-center">
        <p className="text-foreground mb-4">
          We've sent you a magic link to sign in to your account.
        </p>
        {email && (
          <p className="text-sm text-foreground">
            Check your email at <strong>{email}</strong> and click the link to continue.
          </p>
        )}
      </div>

      <div className="text-center">
        <p className="text-foreground text-sm mb-4">
          Didn't receive the email? Check your spam folder or try again.
        </p>
        <Button 
          variant="neutral" 
          onClick={() => window.location.href = "/auth/signin"}
        >
          Back to Sign In
        </Button>
      </div>
    </div>
  );
}

export default function VerifyRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="mt-20 flex items-center justify-center">Loading...</div>
      }
    >
      <VerifyRequestContent />
    </Suspense>
  );
}