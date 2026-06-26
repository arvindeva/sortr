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
  return {
    runs,
    merging: { left: nLeft, right: nRight, out: nOut },
    comparisons,
  };
}

function finalRanking(s: SortState): Item[] {
  return s.runs[0].map((id) => BY_ID[id]);
}

// Theme-aware medal colors for rank 1/2/3 (gold/silver/bronze stay across themes).
const MEDALS = [
  "var(--medal-gold)",
  "var(--medal-silver)",
  "var(--medal-bronze)",
];

export function HeroDuel() {
  const [state, setState] = useState<SortState>(initialState);

  const pair = nextPair(state);
  const done = pair === null;
  const ranking = done ? finalRanking(state) : [];
  const completed = done ? TOTAL_STEPS : state.comparisons;

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
        <h1 className="display text-foreground text-[clamp(3rem,9vw,5rem)] font-black">
          Rank
          <br />
          <span className="text-main">anything.</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-lg text-[15px] leading-relaxed md:mt-5 md:text-xl">
          Pick a favorite, one matchup at a time. Sortr builds the list.
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

        <p className="text-muted-foreground mt-6 text-sm">
          No account needed.{" "}
          <Link
            href="/auth/signin"
            className="text-cyan-ink font-semibold hover:underline"
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
          <span className="hud text-yellow-ink text-xs">▶ Try it now</span>
          {done && (
            <button
              onClick={reset}
              className="text-cyan-ink font-mono text-[13px] transition-opacity hover:opacity-80"
            >
              ↺ play again
            </button>
          )}
        </div>
        <div className="display text-foreground mb-3.5 text-[26px] font-extrabold">
          Greatest album of the 2010s
        </div>

        {/* One progress track that fills — solid magenta. */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-foreground/15">
          <div
            className="bg-main h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${(completed / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Fixed height (fits both the duel and the taller result list) so
            finishing never grows the panel / shifts the hero layout. */}
        <div className="flex h-[264px] flex-col justify-center">
          {done ? (
            <div className="text-center">
              <div className="hud text-cyan-ink text-xs">★ Your ranking ★</div>
              <div className="my-3.5 flex flex-col gap-1.5">
                {ranking.map((item, i) => (
                  <div
                    key={item.id}
                    className="border-border bg-foreground/[0.04] flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-left"
                  >
                    <span
                      className="display text-muted-foreground w-[34px] text-[28px] font-black"
                      style={i < 3 ? { color: MEDALS[i] } : undefined}
                    >
                      {i + 1}
                    </span>
                    <span className="text-foreground flex-1 font-bold">
                      {item.name}
                    </span>
                    <span className="text-muted-foreground font-mono text-xs">
                      {item.sub}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-1.5 sm:gap-2">
                <ContenderTile
                  item={left!}
                  side="left"
                  onClick={() => choose(left!.id)}
                />
                {/* Smaller VS on mobile so the cards get more width */}
                <div className="flex items-center justify-center">
                  <VsMarker size={40} className="sm:hidden" />
                  <VsMarker size={56} className="hidden sm:flex" />
                </div>
                <ContenderTile
                  item={right!}
                  side="right"
                  onClick={() => choose(right!.id)}
                />
              </div>
              <div className="text-cyan-ink mt-2.5 flex items-center justify-center gap-2 font-mono text-xs">
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
  // Magenta (primary) on the left for brand consistency, cyan on the right.
  const glow =
    side === "left"
      ? "hover:border-main hover:shadow-[0_0_28px_rgba(255,46,126,.45)]"
      : "hover:border-cyan hover:shadow-[0_0_28px_rgba(25,227,223,.45)]";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Pick ${item.name}`}
      className={`group border-border bg-card flex h-full flex-col overflow-hidden rounded-xl border text-left transition-all duration-150 hover:-translate-y-1 ${glow}`}
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
      {/* Reserve 2 lines for the sub-label so a 1-line sub doesn't make this
          card shorter than its taller (2-line) neighbor. */}
      <div className="flex flex-1 items-start px-3.5 py-2.5">
        <div className="text-muted-foreground line-clamp-2 min-h-[2.5em] font-mono text-xs leading-tight">
          {item.sub}
        </div>
      </div>
    </button>
  );
}

