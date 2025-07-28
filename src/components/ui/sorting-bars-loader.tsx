import { cn } from "@/lib/utils";

interface SortingBarsLoaderProps {
  className?: string;
  size?: number;
}

export function SortingBarsLoader({
  className,
  size = 120,
}: SortingBarsLoaderProps) {
  return (
    <div className={cn("-mb-4 flex justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 40"
        style={{ transform: "scaleY(-1)" }}
        className="text-main"
      >
        <rect x="8" y="15" width="6" height="20" fill="currentColor">
          <animate
            attributeName="height"
            values="20;30;20;10;20"
            dur="1s"
            begin="0s"
            repeatCount="indefinite"
          ></animate>
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="1s"
            begin="0s"
            repeatCount="indefinite"
          ></animate>
        </rect>
        <rect x="17" y="15" width="6" height="20" fill="currentColor">
          <animate
            attributeName="height"
            values="20;30;20;10;20"
            dur="1s"
            begin="0.1s"
            repeatCount="indefinite"
          ></animate>
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="1s"
            begin="0.1s"
            repeatCount="indefinite"
          ></animate>
        </rect>
        <rect x="26" y="15" width="6" height="20" fill="currentColor">
          <animate
            attributeName="height"
            values="20;30;20;10;20"
            dur="1s"
            begin="0.2s"
            repeatCount="indefinite"
          ></animate>
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="1s"
            begin="0.2s"
            repeatCount="indefinite"
          ></animate>
        </rect>
        <rect x="35" y="15" width="6" height="20" fill="currentColor">
          <animate
            attributeName="height"
            values="20;30;20;10;20"
            dur="1s"
            begin="0.3s"
            repeatCount="indefinite"
          ></animate>
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="1s"
            begin="0.3s"
            repeatCount="indefinite"
          ></animate>
        </rect>
        <rect x="44" y="15" width="6" height="20" fill="currentColor">
          <animate
            attributeName="height"
            values="20;30;20;10;20"
            dur="1s"
            begin="0.4s"
            repeatCount="indefinite"
          ></animate>
          <animate
            attributeName="opacity"
            values="0.2;1;0.2"
            dur="1s"
            begin="0.4s"
            repeatCount="indefinite"
          ></animate>
        </rect>
      </svg>
    </div>
  );
}
