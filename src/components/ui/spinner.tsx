import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
  size?: number;
}

export function Spinner({ className, size = 24 }: SpinnerProps) {
  return (
    <div className={cn("flex justify-center", className)}>
      <Loader2 size={size} className="text-main animate-spin" />
    </div>
  );
}
