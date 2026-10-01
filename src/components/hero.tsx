"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Words the hero headline cycles through after "RANK".
const TYPEWRITER_WORDS = [
  "anything",
  "albums",
  "characters",
  "movies",
  "books",
  "ships",
  "games",
  "bosses",
];

/**
 * The cycling word of the hero headline: types a word out, pauses, deletes it,
 * moves to the next — with a block cursor. It sits on the hero's cyan
 * "selected fighter" block, so text and cursor are fixed midnight in both
 * themes. Respects prefers-reduced-motion by holding a single word.
 */
function TypewriterWord() {
  const [text, setText] = useState(TYPEWRITER_WORDS[0]);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // hold the first word, no typing loop

    let wordIdx = 0;
    let charIdx = TYPEWRITER_WORDS[0].length;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const word = TYPEWRITER_WORDS[wordIdx];
      if (!deleting) {
        charIdx++;
        setText(word.slice(0, charIdx));
        if (charIdx >= word.length) {
          deleting = true;
          timer = setTimeout(tick, 1400); // pause on the full word
          return;
        }
        timer = setTimeout(tick, 90);
      } else {
        charIdx--;
        setText(word.slice(0, charIdx));
        if (charIdx <= 0) {
          deleting = false;
          wordIdx = (wordIdx + 1) % TYPEWRITER_WORDS.length;
          timer = setTimeout(tick, 220); // beat before the next word
          return;
        }
        timer = setTimeout(tick, 45);
      }
    };

    timer = setTimeout(tick, 1400); // start: pause on the initial full word
    return () => clearTimeout(timer);
  }, []);

  return (
    // translate="no": in-page translators wrapping this constantly-mutating
    // text was the site's single biggest crash surface (see the DOM patch in
    // layout.tsx) — and a half-translated typewriter looked broken anyway.
    <span
      translate="no"
      className="inline-flex items-baseline whitespace-nowrap text-[#0b0918]"
    >
      {/* Zero-width space keeps full text metrics on the line even when the
          word is fully deleted — otherwise the line collapses to the .display
          line-height strut and everything below the hero jumps up ~0.3em
          during the between-words beat. */}
      {"\u200B"}
      {text}
      <span
        aria-hidden
        className="ml-[0.06em] inline-block w-[0.5em] self-stretch bg-[#0b0918] motion-safe:animate-[hero-caret_1.1s_linear_infinite]"
      />
    </span>
  );
}

/**
 * The homepage hero, character-select edition: "Rank" plus the cycling word
 * set in a tilted cyan block, like a highlighted pick on a select screen, a
 * one-line tagline, and the two CTAs — Create (magenta primary) and Browse
 * (neutral). Stacked full-width buttons on mobile, side by side from sm up.
 * Left-aligned: the word types rightward from a fixed edge, so "Rank" never
 * shifts.
 */
export function Hero() {
  return (
    <section className="flex flex-col items-start py-9">
      <h1 className="display text-foreground flex items-center gap-[0.22em] text-[clamp(2.1rem,8.5vw,4.25rem)] font-black whitespace-nowrap">
        Rank
        <span className="bg-cyan inline-flex -rotate-2 rounded-md px-[0.16em] pt-[0.05em] pb-[0.01em]">
          <TypewriterWord />
        </span>
      </h1>
      <p className="text-muted-foreground mt-3.5 text-[clamp(14px,4.2vw,17px)] whitespace-nowrap md:text-lg">
        Pick a favorite, one matchup at a time.
      </p>

      <div className="mt-[1.6rem] flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
        <Button
          asChild
          arcade
          className="group text-[19px] [&_svg]:size-[18px]"
        >
          <Link href="/create">
            <Plus
              className="transition-transform duration-200 group-hover:rotate-90"
              size={18}
              strokeWidth={3}
            />
            Create
          </Link>
        </Button>
        <Button asChild variant="neutral" arcade className="text-[19px]">
          <Link href="/browse">Browse</Link>
        </Button>
      </div>
    </section>
  );
}
