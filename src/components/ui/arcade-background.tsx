/**
 * The fixed page atmosphere for the VERSUS arcade look: radial magenta + cyan
 * glows painted behind all content. Rendered once in the
 * root layout. Uses the `.arcade-atmosphere` pseudo-element layers from
 * globals.css so the gradients track the active theme's tokens.
 */
export function ArcadeBackground() {
  return (
    <div
      aria-hidden
      className="arcade-atmosphere pointer-events-none fixed inset-0 z-0"
    />
  );
}
