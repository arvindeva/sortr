import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { accentFor } from "@/lib/utils";

// Shared renderer for the generic "RANK ANYTHING" OG / share card. Used by the
// root app/opengraph-image.tsx and re-exported by routes that define their own
// metadata (which otherwise wouldn't pick up the file-convention default).
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = "sortr — rank anything";
export const OG_CONTENT_TYPE = "image/png";

const FONT_DIR = join(process.cwd(), "src/app/_og-fonts");

async function ogFonts() {
  const [bigShoulders, spaceGrotesk] = await Promise.all([
    readFile(join(FONT_DIR, "big-shoulders-900.ttf")),
    readFile(join(FONT_DIR, "space-grotesk-400.ttf")),
  ]);
  return [
    {
      name: "Big Shoulders Display",
      data: bigShoulders,
      weight: 900 as const,
      style: "normal" as const,
    },
    {
      name: "Space Grotesk",
      data: spaceGrotesk,
      weight: 400 as const,
      style: "normal" as const,
    },
  ];
}

// Medal tints for the top-3 tiles on the ranking OG card.
const MEDAL = ["#ffd23f", "#cdd6e8", "#d68a4e"];

export async function renderGenericOgImage() {
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
      ...OG_SIZE,
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

export interface RankingOgItem {
  id: string;
  title: string;
  imageUrl?: string;
}

/**
 * Dynamic OG / social-preview card for a specific ranking. Shows the sorter
 * title, who ranked it, and the top items as tiles (photo when available, else
 * an accent block with the name) — so a shared link previews the actual ranking
 * instead of the generic card. This is the unit that propagates a viral share.
 */
export async function renderRankingOgImage({
  sorterTitle,
  username,
  items,
}: {
  sorterTitle: string;
  username: string;
  items: RankingOgItem[];
}) {
  const fonts = await ogFonts();
  const top = items.slice(0, 5);
  const tileW = 200;
  const tileGap = 18;

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
          flexDirection: "column",
          fontFamily: "Space Grotesk",
          padding: "56px",
        }}
      >
        {/* Atmosphere */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "1200px",
            height: "630px",
            background:
              "radial-gradient(820px 480px at 88% -10%, rgba(255,46,126,.26), transparent 60%)",
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
              "radial-gradient(720px 520px at -5% 35%, rgba(25,227,223,.16), transparent 55%)",
          }}
        />

        {/* Header: logo + who ranked it */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "4px",
                  background: "#ff2e7e",
                }}
              />
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "4px",
                  border: "3px solid #19e3df",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "Big Shoulders Display",
                fontWeight: 900,
                fontSize: "38px",
                color: "#f3f0ff",
                letterSpacing: "0.02em",
              }}
            >
              SORTR
            </span>
          </div>
          <span
            style={{
              fontFamily: "Space Grotesk",
              fontSize: "24px",
              color: "#19e3df",
              letterSpacing: "0.04em",
            }}
          >
            @{username}&apos;s ranking
          </span>
        </div>

        {/* Sorter title */}
        <div
          style={{
            display: "flex",
            fontFamily: "Big Shoulders Display",
            fontWeight: 900,
            fontSize: sorterTitle.length > 36 ? "72px" : "92px",
            lineHeight: 0.9,
            color: "#f3f0ff",
            textTransform: "uppercase",
            marginTop: "38px",
            // Clamp very long titles so the tiles still fit.
            maxHeight: "210px",
            overflow: "hidden",
          }}
        >
          {sorterTitle}
        </div>

        {/* Top-item tiles, pinned to the bottom */}
        <div
          style={{
            display: "flex",
            gap: `${tileGap}px`,
            marginTop: "auto",
          }}
        >
          {top.map((item, i) => (
            <div
              key={item.id}
              style={{
                position: "relative",
                display: "flex",
                width: `${tileW}px`,
                height: `${tileW}px`,
                borderRadius: "16px",
                overflow: "hidden",
                background: item.imageUrl ? "#13102a" : accentFor(item.id),
                border: i < 3 ? `3px solid ${MEDAL[i]}` : "3px solid transparent",
              }}
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  width={tileW}
                  height={tileW}
                  style={{ objectFit: "cover", width: "100%", height: "100%" }}
                />
              ) : (
                <span
                  style={{
                    display: "flex",
                    padding: "14px",
                    fontFamily: "Big Shoulders Display",
                    fontWeight: 900,
                    fontSize: "30px",
                    lineHeight: 0.92,
                    color: "rgba(0,0,0,.72)",
                    textTransform: "uppercase",
                    alignItems: "flex-end",
                    height: "100%",
                  }}
                >
                  {item.title}
                </span>
              )}
              {/* Rank badge */}
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: i < 3 ? MEDAL[i] : "rgba(0,0,0,.6)",
                  color: i < 3 ? "rgba(0,0,0,.78)" : "#fff",
                  fontFamily: "Big Shoulders Display",
                  fontWeight: 900,
                  fontSize: "26px",
                }}
              >
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
