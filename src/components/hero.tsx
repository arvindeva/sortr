"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Words the hero headline cycles through after "RANK".
const TYPEWRITER_WORDS = [
  "anything.",
  "albums.",
  "characters.",
  "movies.",
  "books.",
  "ships.",
  "games.",
  "bosses.",
];

/**
 * The cycling second line of the hero headline: types a word out, pauses,
 * deletes it, moves to the next — with a glowing block cursor. The line is
 * centered, so it re-centers as it types (only this line moves; nothing below
 * shifts). Respects prefers-reduced-motion by holding a single word.
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
    <span className="text-main inline-flex items-baseline whitespace-nowrap">
      {text}
      <span
        aria-hidden
        className="bg-main ml-[0.06em] inline-block w-[0.5em] self-stretch shadow-[0_0_18px] shadow-main/70 motion-safe:animate-[hero-caret_1.1s_linear_infinite]"
      />
    </span>
  );
}

/**
 * The centered homepage hero: typewriter headline, tagline, and the two CTAs —
 * Create (magenta primary, the more important action) and Browse (neutral).
 * Stacked full-width buttons on mobile, side by side from sm up.
 */
export function Hero() {
  return (
    <section className="flex flex-col items-center py-12 text-center md:py-20">
      <h1 className="display text-foreground text-[clamp(3.5rem,11vw,5.5rem)] font-black">
        Rank
        <br />
        <TypewriterWord />
      </h1>
      <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed md:mt-5 md:text-xl">
        Pick a favorite, one matchup at a time.
      </p>

      <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center">
        <Button
          asChild
          size="lg"
          arcade
          className="group md:h-14 md:px-9 md:text-[1.35em]"
        >
          <Link href="/create">
            <Plus
              className="transition-transform duration-200 group-hover:rotate-90"
              size={18}
            />
            Create a sorter
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="neutral"
          arcade
          className="md:h-14 md:px-9 md:text-[1.35em]"
        >
          <Link href="/browse">Browse sorters</Link>
        </Button>
      </div>
    </section>
  );
}
