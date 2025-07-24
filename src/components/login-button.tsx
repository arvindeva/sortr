"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  className?: string;
}

export function LoginButton({ className }: LoginButtonProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <Button disabled className={className}>
        Loading...
      </Button>
    );
  }

  if (session) {
    return (
      <Button onClick={() => signOut()} className={className}>
        Logout
      </Button>
    );
  }

  return (
    <Button onClick={() => signIn()} className={className}>
      Login with Email
    </Button>
  );
}
