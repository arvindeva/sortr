interface TickerItem {
  title: string;
  /** Username, or null for an anonymous ranking. */
  by: string | null;
}

/**
 * The full-bleed activity ticker under the hero — a continuous mono marquee of
 * what people are ranking right now, styled like a live feed. Built from real
 * popular sorters. The track is duplicated so the -50% translate loops
 * seamlessly; pauses on hover.
 */
export function ActivityTicker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;

  const segment = items
    .map((it) => `${it.by ? `@${it.by}` : "Anonymous"} ranked ${it.title}`)
    .join("  ·  ");
  // Trailing separator so the wrap-around has a gap too.
  const text = `● ${segment}  ·  `;

  return (
    // Full-bleed: break out of the centered container to span the whole
    // viewport width regardless of where it sits in the layout.
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-border bg-cyan/5 py-3">
      <div className="sortr-marquee flex w-max whitespace-nowrap font-mono text-[13px] tracking-wide text-muted-foreground">
        {/* Two identical copies → seamless loop */}
        <span aria-hidden={false}>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
    </div>
  );
}
