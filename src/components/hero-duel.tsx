"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, Trophy } from "lucide-react";

interface Item {
  id: string;
  emoji: string;
  label: string;
}

// The demo sorter: a real, finite 4-item ranking everyone has an opinion on.
const ITEMS: Item[] = [
  { id: "spring", emoji: "🌸", label: "Spring" },
  { id: "summer", emoji: "☀️", label: "Summer" },
  { id: "autumn", emoji: "🍂", label: "Autumn" },
  { id: "winter", emoji: "❄️", label: "Winter" },
];

// Total comparisons a 4-item merge sort needs in the worst case.
const TOTAL_STEPS = 5;

/**
 * A tiny merge-sort state machine over the 4 items. It exposes the next
 * pair to compare; recording a winner advances the sort until a single
 * fully-ranked list remains. Pure and deterministic — easy to reason about.
 */
type SortState = {
  // Lists still being merged, each already internally sorted (best first).
  runs: string[][];
  // The merge currently in progress (if any): two runs + the output so far.
  merging: { left: string[]; right: string[]; out: string[] } | null;
  // Comparisons answered so far (drives the progress bar).
  comparisons: number;
};

function initialState(): SortState {
  // Start with each item as its own sorted run.
  return { runs: ITEMS.map((i) => [i.id]), merging: null, comparisons: 0 };
}

// Returns the next pair to compare, or null when fully sorted.
function nextPair(s: SortState): { a: string; b: string } | null {
  if (s.merging) {
    return { a: s.merging.left[0], b: s.merging.right[0] };
  }
  if (s.runs.length > 1) {
    // Begin merging the first two runs.
    return { a: s.runs[0][0], b: s.runs[1][0] };
  }
  return null; // single run left = done
}

// Record that `winnerId` beat the other item in the current comparison.
function advance(s: SortState, winnerId: string): SortState {
  let merging = s.merging;
  let runs = s.runs;
  const comparisons = s.comparisons + 1;

  // If not mid-merge, start one with the first two runs.
  if (!merging) {
    const [left, right, ...rest] = runs;
    merging = { left, right, out: [] };
    runs = rest;
  }

  const { left, right, out } = merging;
  let nLeft = left;
  let nRight = right;
  const nOut = [...out];

  // The winner is the higher-ranked head; move it to the output.
  if (winnerId === left[0]) {
    nOut.push(left[0]);
    nLeft = left.slice(1);
  } else {
    nOut.push(right[0]);
    nRight = right.slice(1);
  }

  // If either side is exhausted, flush the rest and finish this merge.
  if (nLeft.length === 0 || nRight.length === 0) {
    const merged = [...nOut, ...nLeft, ...nRight];
    const newRuns = [...runs, merged];
    return { runs: newRuns, merging: null, comparisons };
  }

  return {
    runs,
    merging: { left: nLeft, right: nRight, out: nOut },
    comparisons,
  };
}

function finalRanking(s: SortState): Item[] {
  return s.runs[0].map((id) => ITEMS.find((i) => i.id === id)!);
}

export function HeroDuel() {
  const [state, setState] = useState<SortState>(initialState);

  const pair = nextPair(state);
  const done = pair === null;
  const ranking = done ? finalRanking(state) : [];
  // Some answer paths finish in 4 comparisons; once done, show the bar full.
  const completed = done ? TOTAL_STEPS : state.comparisons;

  const left = pair ? ITEMS.find((i) => i.id === pair.a)! : null;
  const right = pair ? ITEMS.find((i) => i.id === pair.b)! : null;

  function choose(winnerId: string) {
    if (!pair) return;
    setState((s) => advance(s, winnerId));
  }

  function reset() {
    setState(initialState());
  }

  return (
    <section className="relative isolate flex flex-col items-center gap-8 py-6 md:flex-row md:justify-between md:gap-12 md:py-10">
      {/* Left: wordmark + pitch */}
      <div className="max-w-lg text-center md:text-left">
        <h1 className="text-5xl font-bold tracking-tight md:text-7xl">sortr</h1>
        <p className="mt-4 text-lg text-balance text-muted-foreground md:text-xl">
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

      {/* Right: the interactive demo sorter, in an elevated card.
          Fixed min-height so swapping duel <-> ranking never shifts the page. */}
      <div className="flex min-h-[320px] w-full max-w-sm select-none flex-col rounded-2xl border-2 border-main/30 bg-card p-4 shadow-[0_8px_40px_-8px] shadow-main/25 ring-1 ring-main/5 md:min-h-[340px] md:p-5">
        {/* Header row */}
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            {done ? "your ranking" : "which season is better?"}
          </span>
          {done ? (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-main"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              try again
            </button>
          ) : (
            <span className="font-medium text-muted-foreground">
              {completed}/{TOTAL_STEPS}
            </span>
          )}
        </div>

        {/* Progress dots */}
        <div className="mb-4 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i < completed ? "bg-main" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center">
        {done ? (
          /* Final ranking reveal */
          <ol className="space-y-1.5">
            {ranking.map((item, i) => (
              <li
                key={item.id}
                className={`flex items-center gap-3 rounded-base border p-2.5 transition-all ${
                  i === 0
                    ? "border-main/40 bg-accent"
                    : "border-border bg-secondary-background"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-main text-main-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-2xl">{item.emoji}</span>
                <span className="font-semibold">{item.label}</span>
                {i === 0 && <Trophy className="ml-auto h-4 w-4 text-main" />}
              </li>
            ))}
          </ol>
        ) : (
          /* The duel */
          <>
            <div className="relative flex items-stretch gap-3">
              <DuelCard contender={left!} onClick={() => choose(left!.id)} />

              {/* VS badge */}
              <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-sm font-bold tracking-tight text-foreground shadow-md">
                  VS
                </span>
              </div>

              <DuelCard contender={right!} onClick={() => choose(right!.id)} />
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              that&apos;s the whole idea. a few taps and you&apos;ve got a
              ranking.
            </p>
          </>
        )}
        </div>
      </div>
    </section>
  );
}

function DuelCard({
  contender,
  onClick,
}: {
  contender: Item;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pick ${contender.label}`}
      className="group flex flex-1 flex-col items-center justify-center gap-2 rounded-base border border-border bg-secondary-background p-4 transition-all duration-200 hover:-translate-y-1 hover:border-main/40 hover:shadow-lg md:p-6"
    >
      <span className="text-4xl transition-transform duration-200 group-hover:scale-110 md:text-5xl">
        {contender.emoji}
      </span>
      <span className="text-sm font-semibold md:text-base">
        {contender.label}
      </span>
    </button>
  );
}
