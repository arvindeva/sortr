// Verifies src/lib/edit-item-image.ts — how edit/finalize decides which
// existing image an edited item keeps. The Aug 24 incident: a stale edit form
// (back button / second tab / re-save) sent item IDs from a previous version;
// finalize matched nothing and silently nulled every image. Run:
//   node --experimental-strip-types scripts/test-edit-image-matching.mjs
import { resolveEditedItemImageUrl } from "../src/lib/edit-item-image.ts";

let failures = 0;
function check(name, actual, expected) {
  if (actual === expected) console.log(`PASS ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const current = [
  { id: "aaa", title: "Spider-Man", imageUrl: "https://cdn/spidey.jpg" },
  { id: "bbb", title: "Venom", imageUrl: "https://cdn/venom.jpg" },
  { id: "ccc", title: "Text Only Guy", imageUrl: null },
];

// 1. Live ID match keeps its image
check(
  "id match returns its image",
  resolveEditedItemImageUrl({ title: "Spider-Man", itemId: "aaa" }, current),
  "https://cdn/spidey.jpg",
);

// 2. THE INCIDENT: stale ID (from a previous version) + unchanged title → title rescues it
check(
  "stale id falls back to title match",
  resolveEditedItemImageUrl({ title: "Venom", itemId: "old-dead-id" }, current),
  "https://cdn/venom.jpg",
);

// 3. Title fallback is case-insensitive (matches the pre-existing legacy behavior)
check(
  "title fallback is case-insensitive",
  resolveEditedItemImageUrl({ title: "VENOM", itemId: "old-dead-id" }, current),
  "https://cdn/venom.jpg",
);

// 4. No itemId at all (legacy client) → title match
check(
  "no id uses title match",
  resolveEditedItemImageUrl({ title: "Spider-Man" }, current),
  "https://cdn/spidey.jpg",
);

// 5. Genuinely new item: no id match, no title match → no image
check(
  "new item gets null",
  resolveEditedItemImageUrl({ title: "Brand New Character", itemId: "new-123" }, current),
  null,
);

// 6. ID matches an imageless row and no other row shares the title → null
check(
  "imageless id match stays null",
  resolveEditedItemImageUrl({ title: "Text Only Guy", itemId: "ccc" }, current),
  null,
);

// 7. Renamed item with stale id: neither id nor new title matches → null
//    (documents the one case a stale form still loses an image — rename + stale)
check(
  "stale id + renamed title gets null",
  resolveEditedItemImageUrl({ title: "Venom (Renamed)", itemId: "old-dead-id" }, current),
  null,
);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
