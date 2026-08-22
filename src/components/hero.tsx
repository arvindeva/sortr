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
    // translate="no": in-page translators wrapping this constantly-mutating
    // text was the site's single biggest crash surface (see the DOM patch in
    // layout.tsx) — and a half-translated typewriter looked broken anyway.
    <span
      translate="no"
      className="text-main inline-flex items-baseline whitespace-nowrap"
    >
      {/* Zero-width space keeps full text metrics on the line even when the
          word is fully deleted — otherwise the line collapses to the .display
          line-height strut and everything below the hero jumps up ~0.3em
          during the between-words beat. */}
      {"\u200B"}
      {text}
      <span
        aria-hidden
        className="bg-main ml-[0.06em] inline-block w-[0.5em] self-stretch shadow-[0_0_18px] shadow-main/70 motion-safe:animate-[hero-caret_1.1s_linear_infinite]"
      />
    </span>
  );
}

/**
 * The homepage hero, compact-masthead edition: the content rows below are the
 * heart of the page, so this is a single-line typewriter headline, one-line
 * tagline, and the two CTAs — Create (magenta primary) and Browse (neutral).
 * Stacked full-width buttons on mobile, side by side from sm up. Left-aligned:
 * the word types rightward from a fixed edge, so "Rank" never shifts.
 */
export function Hero() {
  return (
    <section className="flex flex-col items-start py-8 text-left md:py-10">
      <h1 className="display text-foreground text-[clamp(2.25rem,6.5vw,3.5rem)] font-black whitespace-nowrap">
        Rank <TypewriterWord />
      </h1>
      <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed md:text-base">
        Pick a favorite, one matchup at a time.
      </p>

      <div className="mt-5 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-start">
        <Button asChild size="lg" arcade className="group">
          <Link href="/create">
            <Plus
              className="transition-transform duration-200 group-hover:rotate-90"
              size={18}
            />
            Create a sorter
          </Link>
        </Button>
        <Button asChild size="lg" variant="neutral" arcade>
          <Link href="/browse">Browse sorters</Link>
        </Button>
      </div>
    </section>
  );
}
