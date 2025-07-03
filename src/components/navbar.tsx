"use client"
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LoginButton } from "@/components/login-button"
import { ModeToggle } from "@/components/mode-toggle"

export function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="w-full flex items-center justify-between px-6 py-4 border-b bg-background/90 sticky top-0 z-30">
            <div className="text-3xl font-bold tracking-tight">sortr</div>
            <div className="flex items-center gap-2">

                {session ? (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">Hi, {session.user?.name || session.user?.email || "User"}</span>
                        <Button size="sm" variant="outline" onClick={() => signOut()}>
                            Logout
                        </Button>
                    </div>
                ) : (
                    <LoginButton />
                )}
                <ModeToggle />
            </div>
        </nav>
    );
}
