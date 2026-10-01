/**
 * Team-colored section heading: the title sits in a tilted block of the
 * section's accent (--team, set by teamColorStyle) with midnight text. The
 * block is an inline span with box-decoration-break: clone, so when a long
 * title wraps on a narrow screen each line gets its own block hugging its
 * text, instead of one block stretched to the full available width.
 */
export function TeamHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="display min-w-0 -rotate-[1.5deg] text-3xl leading-[1.18] font-black md:text-[42px]">
      <span className="bg-(--team) box-decoration-clone rounded-md px-[0.18em] pt-[0.06em] pb-[0.01em] text-[#0b0918]">
        {children}
      </span>
    </h2>
  );
}
