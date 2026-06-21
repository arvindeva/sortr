"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Fun, relatable matchups that show off what sortr is for.
const MATCHUPS: Array<[Contender, Contender]> = [
  [
    { emoji: "🍕", label: "Pizza" },
    { emoji: "🍣", label: "Sushi" },
  ],
  [
    { emoji: "🐱", label: "Cats" },
    { emoji: "🐶", label: "Dogs" },
  ],
  [
    { emoji: "☕", label: "Coffee" },
    { emoji: "🍵", label: "Tea" },
  ],
  [
    { emoji: "🏔️", label: "Mountains" },
    { emoji: "🏖️", label: "Beach" },
  ],
  [
    { emoji: "🌅", label: "Early bird" },
    { emoji: "🌙", label: "Night owl" },
  ],
  [
    { emoji: "📕", label: "The book" },
    { emoji: "🎬", label: "The movie" },
  ],
];

interface Contender {
  emoji: string;
  label: string;
}

export function HeroDuel() {
  const [index, setIndex] = useState(0);
  const [wins, setWins] = useState(0);
  // Tracks which side was just picked so we can flash a "winner" state.
  const [picked, setPicked] = useState<0 | 1 | null>(null);

  const [left, right] = MATCHUPS[index];

  function choose(side: 0 | 1) {
    if (picked !== null) return; // ignore double clicks mid-transition
    setPicked(side);
    setWins((w) => w + 1);
    // Let the winner state show briefly, then slide to the next matchup.
    setTimeout(() => {
      setIndex((i) => (i + 1) % MATCHUPS.length);
      setPicked(null);
    }, 550);
  }

  return (
    <section className="relative isolate flex flex-col items-center gap-10 py-10 md:flex-row md:justify-between md:gap-12 md:py-16">
      {/* Left: wordmark + pitch */}
      <div className="max-w-md text-center md:text-left">
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">sortr</h1>
        <p className="mt-4 text-lg text-muted-foreground md:text-xl">
          Rank anything by settling it one matchup at a time.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:items-start">
          <Button asChild size="lg" className="group w-full sm:w-auto">
            <Link href="/create">
              <Plus
                className="transition-transform duration-200 group-hover:rotate-90"
                size={18}
              />
              Create a Sorter
            </Link>
          </Button>
          <Button
            asChild
            variant="neutral"
            size="lg"
            className="w-full sm:w-auto"
          >
            <Link href="/browse">Browse Sorters</Link>
          </Button>
        </div>
      </div>

      {/* Right: the interactive duel */}
      <div className="w-full max-w-md select-none">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            which is better?
          </span>
          <span className="text-muted-foreground">
            {wins > 0 ? (
              <span className="font-semibold text-main">
                {wins} pick{wins === 1 ? "" : "s"}
              </span>
            ) : (
              "tap to choose"
            )}
          </span>
        </div>

        <div className="relative flex items-stretch gap-3">
          <DuelCard
            contender={left}
            state={picked === 0 ? "won" : picked === 1 ? "lost" : "idle"}
            onClick={() => choose(0)}
          />

          {/* VS badge */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-sm font-bold tracking-tight text-foreground shadow-md">
              VS
            </span>
          </div>

          <DuelCard
            contender={right}
            state={picked === 1 ? "won" : picked === 0 ? "lost" : "idle"}
            onClick={() => choose(1)}
          />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          that&apos;s the whole idea. do it a few times and you&apos;ve got a
          ranking.
        </p>
      </div>
    </section>
  );
}

function DuelCard({
  contender,
  state,
  onClick,
}: {
  contender: Contender;
  state: "idle" | "won" | "lost";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pick ${contender.label}`}
      className={[
        "group flex flex-1 flex-col items-center justify-center gap-3 rounded-base border p-6 transition-all duration-300 md:p-8",
        state === "idle" &&
          "border-border bg-secondary-background hover:-translate-y-1 hover:border-main/40 hover:shadow-lg",
        state === "won" &&
          "scale-[1.03] border-main bg-accent shadow-lg shadow-main/20",
        state === "lost" && "scale-95 border-border opacity-40",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="text-5xl transition-transform duration-200 group-hover:scale-110 md:text-6xl">
        {contender.emoji}
      </span>
      <span className="text-base font-semibold md:text-lg">
        {contender.label}
      </span>
    </button>
  );
}
