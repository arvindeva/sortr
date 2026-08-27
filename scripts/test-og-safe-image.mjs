// Verifies src/lib/og-safe-image.ts — the guard that keeps raw user uploads out
// of Satori/resvg's WASM decoder (a bad image can poison its memory for the
// lifetime of the process). No test framework in this repo; run directly:
//   node --experimental-strip-types scripts/test-og-safe-image.mjs
import { createServer } from "node:http";
import sharp from "sharp";
import { ogSafeImageDataUri } from "../src/lib/og-safe-image.ts";

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`PASS ${name}`);
  else {
    failures++;
    console.log(`FAIL ${name} ${detail}`);
  }
}

// A big photo-like source: 6000x4000 PNG (the class of input that blows up resvg-wasm).
const bigPng = await sharp({
  create: {
    width: 6000,
    height: 4000,
    channels: 3,
    background: { r: 255, g: 46, b: 126 },
  },
})
  .png()
  .toBuffer();

const server = createServer((req, res) => {
  if (req.url === "/big.png") {
    res.writeHead(200, { "content-type": "image/png" });
    res.end(bigPng);
  } else if (req.url === "/corrupt.jpg") {
    res.writeHead(200, { "content-type": "image/jpeg" });
    res.end(Buffer.from("not an image at all"));
  } else if (req.url === "/empty.png") {
    res.writeHead(200, { "content-type": "image/png" });
    res.end(Buffer.alloc(0));
  } else {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

// 1. Huge valid image → small 400x400 baseline JPEG data URI
const uri = await ogSafeImageDataUri(`${base}/big.png`);
check("big image returns data URI", typeof uri === "string" && uri.startsWith("data:image/jpeg;base64,"));
if (typeof uri === "string") {
  const out = Buffer.from(uri.split(",")[1], "base64");
  const meta = await sharp(out).metadata();
  check("output is 400x400", meta.width === 400 && meta.height === 400, `got ${meta.width}x${meta.height}`);
  check("output is jpeg", meta.format === "jpeg", `got ${meta.format}`);
  check("output is small (<200KB)", out.length < 200 * 1024, `got ${out.length} bytes`);
  check(
    "output is baseline, not progressive",
    !meta.isProgressive,
    `isProgressive=${meta.isProgressive}`,
  );
}

// 2. Corrupt bytes → undefined (tile falls back to accent block)
check("corrupt image returns undefined", (await ogSafeImageDataUri(`${base}/corrupt.jpg`)) === undefined);

// 3. HTTP error → undefined
check("404 returns undefined", (await ogSafeImageDataUri(`${base}/missing.png`)) === undefined);

// 4. Empty body → undefined
check("empty body returns undefined", (await ogSafeImageDataUri(`${base}/empty.png`)) === undefined);

// 5. No URL → undefined
check("undefined url returns undefined", (await ogSafeImageDataUri(undefined)) === undefined);

// 6. Unreachable host → undefined (fetch rejects, not hangs — uses the timeout)
check(
  "unreachable host returns undefined",
  (await ogSafeImageDataUri("http://127.0.0.1:1/nope.png")) === undefined,
);

server.close();
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
