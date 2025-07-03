"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
    const { data: session } = useSession();

    if (session) {
        return (
            <Button onClick={() => signOut()}>Logout</Button>
        );
    }

    return (
        <Button onClick={() => signIn("email")}>Login with Email</Button>
    );
}
