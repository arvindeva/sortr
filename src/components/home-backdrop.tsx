/**
 * Homepage-only backdrop: huge, barely-there outlines of rounded squares — the
 * logo's two-squares geometry blown up to room scale (magenta, cyan, and one
 * neutral). Fixed behind the content (the layout's content wrapper is z-10);
 * intentionally NOT the old atmosphere layer — no glows, no grid.
 */
export function HomeBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="border-main/[.08] absolute -top-24 -right-28 size-[340px] rounded-[22px] border-2" />
      <div className="border-cyan/[.07] absolute -bottom-16 -left-20 size-[220px] rounded-[18px] border-2" />
      <div className="border-foreground/[.05] absolute top-[13%] left-[12%] size-28 rounded-[12px] border-2" />
    </div>
  );
}
