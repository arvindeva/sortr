"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LoginButton() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <Button disabled>Loading...</Button>;
    }

    if (session) {
        return (
            <Button onClick={() => signOut()}>Logout</Button>
        );
    }

    return (
        <Button onClick={() => signIn()}>Login with Email</Button>
    );
}
