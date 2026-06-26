import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Site-wide default OG / share card (the "RANK ANYTHING" generic card).
// Next uses this for `/` and every route that doesn't define its own
// opengraph-image (sign in, create, auth, 404, …).
export const alt = "sortr — rank anything";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FONT_DIR = join(process.cwd(), "src/app/_og-fonts");

export default async function Image() {
  const [bigShoulders, spaceGrotesk] = await Promise.all([
    readFile(join(FONT_DIR, "big-shoulders-900.ttf")),
    readFile(join(FONT_DIR, "space-grotesk-400.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          position: "relative",
          overflow: "hidden",
          background: "#0b0918",
          display: "flex",
          fontFamily: "Space Grotesk",
        }}
      >
        {/* Atmosphere — two stacked single-gradient layers (Satori-safe) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "1200px",
            height: "630px",
            background:
              "radial-gradient(820px 480px at 85% -8%, rgba(255,46,126,.28), transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "1200px",
            height: "630px",
            background:
              "radial-gradient(720px 500px at -5% 30%, rgba(25,227,223,.18), transparent 55%)",
          }}
        />

        {/* Logo lockup */}
        <div
          style={{
            position: "absolute",
            top: "46px",
            left: "56px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", gap: "7px" }}>
            <span
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "4px",
                background: "#ff2e7e",
              }}
            />
            <span
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "4px",
                border: "3px solid #19e3df",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "Big Shoulders Display",
              fontWeight: 900,
              fontSize: "44px",
              color: "#f3f0ff",
              letterSpacing: "0.02em",
            }}
          >
            SORTR
          </span>
        </div>

        {/* Headline + sub */}
        <div
          style={{
            position: "absolute",
            left: "56px",
            top: "182px",
            right: "56px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Big Shoulders Display",
              fontWeight: 900,
              fontSize: "170px",
              lineHeight: 0.84,
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "#f3f0ff" }}>Rank</span>
            <span style={{ color: "#ff2e7e" }}>anything.</span>
          </div>
          <span
            style={{
              fontFamily: "Space Grotesk",
              fontSize: "27px",
              color: "#a39ec2",
              marginTop: "30px",
            }}
          >
            Pick a favorite, one matchup at a time. Sortr builds the list.
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Big Shoulders Display",
          data: bigShoulders,
          weight: 900,
          style: "normal",
        },
        {
          name: "Space Grotesk",
          data: spaceGrotesk,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );
}
