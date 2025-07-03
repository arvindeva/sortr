import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle"

export function Navbar() {
    return (
        <nav className="w-full flex items-center justify-between px-6 py-4 border-b bg-background/90 sticky top-0 z-30">
            <div className="text-3xl font-bold tracking-tight">sortr</div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="lg" asChild>
                    <a href="/login">Login</a>
                </Button>
                <ModeToggle />
            </div>
        </nav>
    );
}
