"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VsMarker } from "@/components/ui/sortr-mark";
import { Plus } from "lucide-react";

interface Item {
  id: string;
  /** Display name shown on the contender tile. */
  name: string;
  /** Sub-label (artist), shown under the tile. */
  sub: string;
  /** Cover-tile accent. */
  color: string;
}

// The featured demo: a real, finite 4-item ranking with broad opinions. Named
// tiles (not emoji) so they read as real sorter covers in the arcade system.
const ITEMS: Item[] = [
  { id: "blonde", name: "Blonde", sub: "Frank Ocean", color: "#19e3df" },
  {
    id: "tpab",
    name: "To Pimp a Butterfly",
    sub: "Kendrick Lamar",
    color: "#ff2e7e",
  },
  { id: "melodrama", name: "Melodrama", sub: "Lorde", color: "#9b6bff" },
  { id: "igor", name: "IGOR", sub: "Tyler, the Creator", color: "#ffd23f" },
];

const BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Worst-case comparisons for a 4-item merge sort.
const TOTAL_STEPS = 5;

/**
 * A tiny merge-sort state machine over the 4 items. Exposes the next pair to
 * compare; recording a winner advances the sort until one fully-ranked list
 * remains. Pure and deterministic.
 */
type SortState = {
  runs: string[][];
  merging: { left: string[]; right: string[]; out: string[] } | null;
  comparisons: number;
};

function initialState(): SortState {
  return { runs: ITEMS.map((i) => [i.id]), merging: null, comparisons: 0 };
}

function nextPair(s: SortState): { a: string; b: string } | null {
  if (s.merging) return { a: s.merging.left[0], b: s.merging.right[0] };
  if (s.runs.length > 1) return { a: s.runs[0][0], b: s.runs[1][0] };
  return null;
}

function advance(s: SortState, winnerId: string): SortState {
  let merging = s.merging;
  let runs = s.runs;
  const comparisons = s.comparisons + 1;

  if (!merging) {
    const [left, right, ...rest] = runs;
    merging = { left, right, out: [] };
    runs = rest;
  }

  const { left, right, out } = merging;
  let nLeft = left;
  let nRight = right;
  const nOut = [...out];

  if (winnerId === left[0]) {
    nOut.push(left[0]);
    nLeft = left.slice(1);
  } else {
    nOut.push(right[0]);
    nRight = right.slice(1);
  }

  if (nLeft.length === 0 || nRight.length === 0) {
    const merged = [...nOut, ...nLeft, ...nRight];
    return { runs: [...runs, merged], merging: null, comparisons };
  }
  return { runs, merging: { left: nLeft, right: nRight, out: nOut }, comparisons };
}

function finalRanking(s: SortState): Item[] {
  return s.runs[0].map((id) => BY_ID[id]);
}

const MEDALS = ["#ffd23f", "#cdd6e8", "#d68a4e"];

export function HeroDuel() {
  const [state, setState] = useState<SortState>(initialState);

  const pair = nextPair(state);
  const done = pair === null;
  const ranking = done ? finalRanking(state) : [];
  const completed = done ? TOTAL_STEPS : state.comparisons;
  const round = Math.min(state.comparisons + 1, TOTAL_STEPS);

  const left = pair ? BY_ID[pair.a] : null;
  const right = pair ? BY_ID[pair.b] : null;

  const choose = (winnerId: string) => {
    if (pair) setState((s) => advance(s, winnerId));
  };
  const reset = () => setState(initialState());

  return (
    <section className="grid items-center gap-10 py-10 md:py-14 lg:grid-cols-[1.02fr_.98fr] lg:gap-12">
      {/* Left — the entry point */}
      <div>
        <h1 className="display text-[clamp(3rem,9vw,5rem)] font-black text-foreground">
          Everything&apos;s
          <br />
          <span className="text-main">a versus.</span>
        </h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">
          Rank anything by picking a favorite, one matchup at a time. Sortr
          builds the list for you.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" arcade className="group w-full sm:w-auto">
            <Link href="/browse">Browse sorters</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="neutral"
            arcade
            className="group w-full sm:w-auto"
          >
            <Link href="/create">
              <Plus
                className="transition-transform duration-200 group-hover:rotate-90"
                size={18}
              />
              Create a sorter
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          No account needed.{" "}
          <Link
            href="/auth/signin"
            className="font-semibold text-cyan hover:underline"
          >
            Sign up
          </Link>{" "}
          to create and save your own.
        </p>
      </div>

      {/* Right — the featured-sorter duel machine */}
      <div
        className="relative rounded-2xl border p-5 md:p-6"
        style={{
          borderColor: "var(--panel-border)",
          background: "var(--panel)",
          boxShadow: "var(--panel-glow)",
        }}
      >
        {/* Header */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="hud text-xs text-yellow">▶ Featured sorter</span>
          {done ? (
            <button
              onClick={reset}
              className="font-mono text-[13px] text-cyan transition-opacity hover:opacity-80"
            >
              ↺ play again
            </button>
          ) : (
            <span className="font-mono text-[13px] text-cyan">
              ROUND {round}/{TOTAL_STEPS}
            </span>
          )}
        </div>
        <div className="display mb-3.5 text-[26px] font-extrabold text-foreground">
          Greatest album of the 2010s
        </div>

        {/* Pip progress */}
        <div className="mb-5 flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{
                background: i < completed ? "#19e3df" : "rgba(255,255,255,.12)",
              }}
            />
          ))}
        </div>

        {/* Fixed height so finishing never shifts the hero */}
        <div className="flex min-h-[240px] flex-col justify-center">
          {done ? (
            <div className="text-center">
              <div className="hud text-xs text-cyan">★ Your ranking ★</div>
              <div className="my-4 flex flex-col gap-2">
                {ranking.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-[10px] border border-border bg-white/[0.04] px-3.5 py-2.5 text-left"
                  >
                    <span
                      className="display w-[34px] text-[28px] font-black"
                      style={{ color: i < 3 ? MEDALS[i] : "#6f6a86" }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 font-bold text-foreground">
                      {item.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.sub}
                    </span>
                  </div>
                ))}
              </div>
              <Button onClick={reset} arcade size="sm">
                ↺ Play again
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_64px_1fr] items-center gap-2">
                <ContenderTile
                  item={left!}
                  side="left"
                  onClick={() => choose(left!.id)}
                />
                <div className="flex justify-center">
                  <VsMarker size={56} />
                </div>
                <ContenderTile
                  item={right!}
                  side="right"
                  onClick={() => choose(right!.id)}
                />
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 font-mono text-xs text-cyan">
                <span className="sortr-blink">▮</span> tap a side to keep going
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ContenderTile({
  item,
  side,
  onClick,
}: {
  item: Item;
  side: "left" | "right";
  onClick: () => void;
}) {
  // Left contender glows cyan on hover, right glows magenta — mirrors the duel.
  const glow =
    side === "left"
      ? "hover:border-cyan hover:shadow-[0_0_28px_rgba(25,227,223,.45)]"
      : "hover:border-main hover:shadow-[0_0_28px_rgba(255,46,126,.45)]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pick ${item.name}`}
      className={`group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition-all duration-150 hover:-translate-y-1 ${glow}`}
    >
      <div
        className="relative flex h-[148px] items-center justify-center p-3.5 text-center"
        style={{ background: item.color }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(0,0,0,.05) 0 16px, transparent 16px 32px)",
          }}
        />
        <span
          className="display relative text-[24px] font-extrabold"
          style={{ color: "rgba(0,0,0,.72)", lineHeight: 0.95 }}
        >
          {item.name}
        </span>
      </div>
      <div className="px-3.5 py-2.5">
        <div className="font-mono text-xs text-muted-foreground">
          {item.sub}
        </div>
      </div>
    </button>
  );
}
