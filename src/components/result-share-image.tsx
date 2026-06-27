import { accentFor } from "@/lib/utils";

/**
 * The downloadable "brag" image for a finished ranking — a 1080×1350 (portrait,
 * IG-friendly) arcade card. Rendered off-screen and rasterized to PNG by
 * useDownloadRankingImage via html-to-image.
 *
 * The adaptive-mosaic layout is ported verbatim from the design handoff's
 * renderVals() (Sortr Result Image.dc.html). Two modes so it never leaves
 * holes: N≥5 is a 4-col mosaic with a 2×2 #1 feature and branding filling the
 * trailing gap; N≤4 is an equal centered row with a branding strip below. The
 * grid's top is computed to vertically center the block in the 246→1304 region.
 */

export interface ShareImageItem {
  name: string;
  /** Stable key for the fallback color (item id), and to vary the palette. */
  id: string;
  /** Uploaded artwork; shown as the tile background when present. */
  imageUrl?: string;
}

interface ResultShareImageProps {
  title: string;
  subtitle: string;
  items: ShareImageItem[];
}

interface Tile {
  name: string;
  color: string;
  imageUrl?: string;
  radius: number;
  glow: string;
  border: string;
  badgeMinW: number;
  badgeH: number;
  badgePad: string;
  badgeRadius: number;
  badgeFont: number;
  badgeBg: string;
  badgeColor: string;
  badgeText: string;
  nameSize: number;
  nameLine: string;
  namePad: number;
  nameBottom: number;
  gridColumn: string;
  gridRow: string;
}

interface Branding {
  gridColumn: string;
  gridRow: string;
  fontSize: number;
}

const MEDAL_GLOW = [
  "0 0 64px rgba(255,210,63,.42)",
  "0 0 40px rgba(205,214,232,.45)",
  "0 0 40px rgba(214,138,78,.5)",
];
const MEDAL_BORDER = [
  "2px solid rgba(255,210,63,.75)",
  "2px solid rgba(205,214,232,.7)",
  "2px solid rgba(214,138,78,.72)",
];
const MEDAL_BADGE = ["#ffd23f", "#cdd6e8", "#d68a4e"];
const MEDAL_BADGE_TEXT = [
  "rgba(0,0,0,.82)",
  "rgba(0,0,0,.78)",
  "rgba(0,0,0,.8)",
];

interface Layout {
  tiles: Tile[];
  branding: Branding;
  gridStyle: React.CSSProperties;
}

// Ported verbatim from the handoff renderVals(). Computes the tiles, branding
// cell, and grid container style for N (1..10) items.
function computeLayout(items: ShareImageItem[]): Layout {
  const N = Math.max(1, Math.min(10, items.length));

  const mk = (i: number): Tile => {
    const t: Tile = {
      name: items[i].name,
      color: accentFor(items[i].id),
      imageUrl: items[i].imageUrl,
      radius: 16,
      glow: "none",
      border: "none",
      badgeMinW: 34,
      badgeH: 34,
      badgePad: "0 8px",
      badgeRadius: 9,
      badgeFont: 22,
      badgeBg: "rgba(0,0,0,.55)",
      badgeColor: "#fff",
      badgeText: String(i + 1),
      nameSize: 27,
      nameLine: "0.92",
      namePad: 14,
      nameBottom: 13,
      gridColumn: "auto",
      gridRow: "auto",
    };
    if (i < 3) {
      t.glow = MEDAL_GLOW[i];
      t.border = MEDAL_BORDER[i];
      t.badgeBg = MEDAL_BADGE[i];
      t.badgeColor = MEDAL_BADGE_TEXT[i];
    }
    return t;
  };

  const gap = 14;
  const rowH = 230;
  const cardW = 960;
  const regionTop = 246;
  const regionBottom = 1304;
  const tiles: Tile[] = [];
  const branding: Branding = { gridColumn: "", gridRow: "", fontSize: 40 };
  let gridStyleStr = "";
  let gridHeight = 0;

  if (N >= 5) {
    // mode A: #1 = 2×2 feature, singles flow, branding fills the trailing gap
    const occ = new Set<string>();
    const key = (r: number, c: number) => r + "_" + c;
    for (let r = 1; r <= 2; r++) for (let c = 1; c <= 2; c++) occ.add(key(r, c));

    const f = mk(0);
    f.radius = 22;
    f.gridColumn = "1 / span 2";
    f.gridRow = "1 / span 2";
    f.badgeMinW = 46;
    f.badgeH = 46;
    f.badgePad = "0 18px";
    f.badgeRadius = 12;
    f.badgeFont = 28;
    f.badgeBg = "#ffd23f";
    f.badgeColor = "rgba(0,0,0,.82)";
    f.badgeText = "★ 1";
    f.nameSize = 76;
    f.nameLine = "0.86";
    f.namePad = 24;
    f.nameBottom = 26;
    tiles.push(f);

    let lastR = 2;
    let lastC = 2;
    for (let i = 1; i < N; i++) {
      let fr = 1;
      let fc = 1;
      let found = false;
      for (let r = 1; r <= 12 && !found; r++)
        for (let c = 1; c <= 4; c++) {
          if (!occ.has(key(r, c))) {
            fr = r;
            fc = c;
            found = true;
            break;
          }
        }
      occ.add(key(fr, fc));
      const t = mk(i);
      t.gridColumn = String(fc);
      t.gridRow = String(fr);
      tiles.push(t);
      lastR = fr;
      lastC = fc;
    }

    const trailing = 4 - lastC;
    let bRows: number;
    if (trailing >= 2) {
      branding.gridRow = String(lastR);
      branding.gridColumn = lastC + 1 + " / span " + trailing;
      branding.fontSize = trailing >= 3 ? 40 : 30;
      bRows = Math.max(2, lastR);
    } else if (trailing === 1) {
      branding.gridRow = String(lastR);
      branding.gridColumn = String(lastC + 1);
      branding.fontSize = 19;
      bRows = Math.max(2, lastR);
    } else {
      branding.gridRow = String(Math.max(2, lastR) + 1);
      branding.gridColumn = "1 / -1";
      branding.fontSize = 40;
      bRows = Math.max(2, lastR) + 1;
    }

    gridHeight = bRows * rowH + (bRows - 1) * gap;
    const top = Math.max(
      246,
      Math.round(regionTop + (regionBottom - regionTop - gridHeight) / 2),
    );
    gridStyleStr =
      "position:absolute; top:" +
      top +
      "px; left:60px; right:60px; display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:" +
      rowH +
      "px; gap:" +
      gap +
      "px;";
  } else {
    // mode B: equal row of N covers, branding strip below
    const C = N;
    const tileSize = Math.min(
      Math.round((cardW - (C - 1) * gap) / C),
      474,
    );
    for (let i = 0; i < N; i++) {
      const t = mk(i);
      t.gridColumn = String(i + 1);
      t.gridRow = "1";
      if (i === 0) {
        t.badgeBg = "#ffd23f";
        t.badgeColor = "rgba(0,0,0,.82)";
        t.badgeText = "★ 1";
        t.badgeMinW = 40;
        t.badgeH = 38;
        t.badgeFont = 24;
      }
      t.nameSize = tileSize > 440 ? 56 : tileSize > 300 ? 38 : 30;
      t.nameLine = "0.9";
      tiles.push(t);
    }
    const brandH = 130;
    branding.gridColumn = "1 / -1";
    branding.gridRow = "2";
    branding.fontSize = 40;
    gridHeight = tileSize + gap + brandH;
    const top = Math.max(
      260,
      Math.round(regionTop + (regionBottom - regionTop - gridHeight) / 2),
    );
    gridStyleStr =
      "position:absolute; top:" +
      top +
      "px; left:60px; right:60px; display:grid; grid-template-columns:repeat(" +
      C +
      "," +
      tileSize +
      "px); grid-template-rows:" +
      tileSize +
      "px " +
      brandH +
      "px; justify-content:center; gap:" +
      gap +
      "px;";
  }

  return { tiles, branding, gridStyle: parseStyle(gridStyleStr) };
}

// Turn an inline "a:b; c:d;" string into a React style object.
function parseStyle(s: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of s.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (!prop) continue;
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = val;
  }
  return out as React.CSSProperties;
}

export function ResultShareImage({
  title,
  subtitle,
  items,
}: ResultShareImageProps) {
  const { tiles, branding, gridStyle } = computeLayout(items.slice(0, 10));

  return (
    <div
      id="sortr-result-card"
      style={{
        width: "1080px",
        height: "1350px",
        position: "relative",
        overflow: "hidden",
        background: "#0b0918",
        fontFamily: "var(--font-space-grotesk), sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Atmosphere — three single-gradient glow layers */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1080px",
          height: "1350px",
          background:
            "radial-gradient(760px 540px at 92% -6%, rgba(255,46,126,.24), transparent 60%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1080px",
          height: "1350px",
          background:
            "radial-gradient(720px 600px at -8% 92%, rgba(25,227,223,.12), transparent 55%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: "1080px",
          height: "1350px",
          background:
            "radial-gradient(620px 520px at 50% 46%, rgba(155,107,255,.07), transparent 60%)",
        }}
      />

      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: "58px",
          left: "60px",
          right: "60px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            <span
              style={{
                width: "17px",
                height: "17px",
                borderRadius: "3px",
                background: "#ff2e7e",
              }}
            />
            <span
              style={{
                width: "17px",
                height: "17px",
                borderRadius: "3px",
                border: "3px solid #19e3df",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "var(--font-big-shoulders), 'Arial Narrow', sans-serif",
              fontWeight: 900,
              fontSize: "26px",
              color: "#f3f0ff",
              letterSpacing: "0.02em",
            }}
          >
            SORTR
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-big-shoulders), 'Arial Narrow', sans-serif",
            fontWeight: 900,
            fontSize: "78px",
            lineHeight: 0.9,
            color: "#f3f0ff",
            textTransform: "uppercase",
            marginTop: "18px",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: "18px",
            letterSpacing: "0.16em",
            color: "#19e3df",
            textTransform: "uppercase",
            marginTop: "16px",
          }}
        >
          {subtitle}
        </span>
      </div>

      {/* Adaptive mosaic */}
      <div style={gridStyle}>
        {tiles.map((t, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              borderRadius: `${t.radius}px`,
              overflow: "hidden",
              background: t.color,
              ...(t.imageUrl
                ? {
                    backgroundImage: `url(${t.imageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : {}),
              gridColumn: t.gridColumn,
              gridRow: t.gridRow,
              boxShadow: t.glow,
              border: t.border,
            }}
          >
            {/* stripe texture only on the colored fallback (not over a photo) */}
            {!t.imageUrl && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "repeating-linear-gradient(45deg, rgba(0,0,0,.05) 0 18px, transparent 18px 36px)",
                }}
              />
            )}
            {/* bottom scrim */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "55%",
                background:
                  "linear-gradient(180deg, transparent, rgba(0,0,0,.5))",
              }}
            />
            {/* rank badge */}
            <span
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                minWidth: `${t.badgeMinW}px`,
                height: `${t.badgeH}px`,
                padding: t.badgePad,
                boxSizing: "border-box",
                borderRadius: `${t.badgeRadius}px`,
                background: t.badgeBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-big-shoulders), 'Arial Narrow', sans-serif",
                fontWeight: 900,
                fontSize: `${t.badgeFont}px`,
                color: t.badgeColor,
              }}
            >
              {t.badgeText}
            </span>
            {/* name */}
            <span
              style={{
                position: "absolute",
                left: `${t.namePad}px`,
                right: `${t.namePad}px`,
                bottom: `${t.nameBottom}px`,
                fontFamily: "var(--font-big-shoulders), 'Arial Narrow', sans-serif",
                fontWeight: 800,
                fontSize: `${t.nameSize}px`,
                lineHeight: t.nameLine,
                color: "#fff",
                textTransform: "uppercase",
                textShadow: "0 2px 8px rgba(0,0,0,.4)",
              }}
            >
              {t.name}
            </span>
          </div>
        ))}

        {/* Branding cell */}
        <div
          style={{
            gridColumn: branding.gridColumn,
            gridRow: branding.gridRow,
            position: "relative",
            borderRadius: "16px",
            background: "rgba(255,46,126,.08)",
            border: "1px solid rgba(255,46,126,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "11px",
              justifyContent: "center",
              fontFamily: "var(--font-big-shoulders), 'Arial Narrow', sans-serif",
              fontWeight: 900,
              fontSize: `${branding.fontSize}px`,
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              textAlign: "center",
              lineHeight: 0.92,
            }}
          >
            <span style={{ color: "#f3f0ff" }}>Rank anything at</span>
            <span style={{ color: "#ff2e7e" }}>SORTR.IO</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FULL-RANKING leaderboard card (variable height, 1080 wide). Photos + medal
// glow for the top 10 (column 1), clean text rows for the rest. 10 rows per
// column; the last column holds the remainder. Capped at MAX_VISIBLE so a huge
// sorter can't produce an unreadable 20-column image.
// ============================================================================

const BIG = "var(--font-big-shoulders), 'Arial Narrow', sans-serif";
const MEDAL_NUM = ["#ffd23f", "#cdd6e8", "#d68a4e"];
const MEDAL_ROW_GLOW = [
  "0 0 20px rgba(255,210,63,.5)",
  "0 0 16px rgba(205,214,232,.45)",
  "0 0 16px rgba(214,138,78,.5)",
];
const MEDAL_ROW_BORDER = [
  "1px solid rgba(255,210,63,.4)",
  "1px solid rgba(205,214,232,.35)",
  "1px solid rgba(214,138,78,.4)",
];
const MEDAL_THUMB_GLOW = [
  "0 0 18px rgba(255,210,63,.5)",
  "0 0 14px rgba(205,214,232,.45)",
  "0 0 14px rgba(214,138,78,.5)",
];

const PER_COL = 10;
const MAX_VISIBLE = 100;

export function ResultShareImageFull({
  title,
  subtitle,
  items,
}: ResultShareImageProps) {
  const total = items.length;
  const shown = Math.min(total, MAX_VISIBLE);
  const visible = items.slice(0, shown);
  const cols = Math.ceil(shown / PER_COL);
  const rows = Math.min(PER_COL, shown);
  const hasMore = total > shown;

  // Fixed-width columns; the card grows wider with more columns (a wide image is
  // fine for X) rather than squeezing columns narrow. Everything scales down a
  // step for bigger lists so a 50+ item card stays a sane width.
  const sz =
    cols <= 3
      ? { col: 360, name: 16, thumb: 40, num: 29, rowPadY: 8, rowGap: 10 }
      : cols <= 5
        ? { col: 300, name: 15, thumb: 36, num: 26, rowPadY: 7, rowGap: 9 }
        : { col: 250, name: 13, thumb: 30, num: 22, rowPadY: 6, rowGap: 8 };
  const COL_W = sz.col;
  const COL_GAP = 14;
  const PAD_X = 60;
  const cardWidth = PAD_X * 2 + cols * COL_W + (cols - 1) * COL_GAP;

  return (
    <div
      id="sortr-result-card-full"
      style={{
        width: `${cardWidth}px`,
        position: "relative",
        overflow: "hidden",
        background: "#0b0918",
        fontFamily: "var(--font-space-grotesk), sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(700px 480px at 94% -4%, rgba(255,46,126,.22), transparent 58%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(680px 520px at -6% 12%, rgba(25,227,223,.11), transparent 55%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div style={{ position: "relative", padding: "56px 60px 46px" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <span
                style={{
                  width: "17px",
                  height: "17px",
                  borderRadius: "3px",
                  background: "#ff2e7e",
                }}
              />
              <span
                style={{
                  width: "17px",
                  height: "17px",
                  borderRadius: "3px",
                  border: "3px solid #19e3df",
                }}
              />
            </div>
            <span
              style={{
                fontFamily: BIG,
                fontWeight: 900,
                fontSize: "26px",
                color: "#f3f0ff",
                letterSpacing: "0.02em",
              }}
            >
              SORTR
            </span>
          </div>
          <span
            style={{
              fontFamily: BIG,
              fontWeight: 900,
              fontSize: "62px",
              lineHeight: 0.88,
              color: "#f3f0ff",
              textTransform: "uppercase",
              marginTop: "16px",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: "16px",
              letterSpacing: "0.14em",
              color: "#19e3df",
              textTransform: "uppercase",
              marginTop: "14px",
            }}
          >
            {subtitle}
          </span>
        </div>

        {/* Leaderboard grid — fixed-width columns. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${COL_W}px)`,
            gridTemplateRows: `repeat(${rows}, auto)`,
            gridAutoFlow: "column",
            columnGap: `${COL_GAP}px`,
            rowGap: `${sz.rowGap}px`,
            marginTop: "36px",
          }}
        >
          {visible.map((item, i) => {
            const isTop3 = i < 3;
            const hasPhoto = i < 10 && !!item.imageUrl;
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: isTop3
                    ? "rgba(255,255,255,.06)"
                    : "rgba(255,255,255,.03)",
                  border: isTop3
                    ? MEDAL_ROW_BORDER[i]
                    : "1px solid rgba(255,255,255,.08)",
                  boxShadow: isTop3 ? MEDAL_ROW_GLOW[i] : "none",
                  borderRadius: "10px",
                  padding: `${sz.rowPadY}px 13px ${sz.rowPadY}px 8px`,
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    fontFamily: BIG,
                    fontWeight: 900,
                    fontSize: `${sz.num}px`,
                    color: isTop3 ? MEDAL_NUM[i] : "#6f6a86",
                    width: `${Math.round(sz.thumb * 0.95)}px`,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                {/* Photo thumbnail for the top 10; text-only below. */}
                {i < 10 && (
                  <span
                    style={{
                      width: `${sz.thumb}px`,
                      height: `${sz.thumb}px`,
                      borderRadius: "8px",
                      position: "relative",
                      overflow: "hidden",
                      flexShrink: 0,
                      boxSizing: "border-box",
                      boxShadow: isTop3 ? MEDAL_THUMB_GLOW[i] : "none",
                      border: isTop3
                        ? MEDAL_BORDER[i]
                        : "1px solid rgba(255,255,255,.1)",
                      ...(hasPhoto
                        ? {
                            backgroundImage: `url(${item.imageUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : { background: accentFor(item.id) }),
                    }}
                  >
                    {!hasPhoto && (
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(0,0,0,.07) 0 7px, transparent 7px 14px)",
                        }}
                      />
                    )}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontWeight: 700,
                    fontSize: `${sz.name}px`,
                    lineHeight: 1.06,
                    color: "#f3f0ff",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <div
            style={{
              marginTop: "18px",
              textAlign: "center",
              fontFamily: "var(--font-space-mono), monospace",
              fontSize: "15px",
              letterSpacing: "0.06em",
              color: "#8c87a6",
              textTransform: "uppercase",
            }}
          >
            +{total - shown} more · see the full ranking on sortr.io
          </div>
        )}

        {/* Footer — single right-aligned tagline, vertically centered between
            the divider line and the card's bottom edge. */}
        <div
          style={{
            marginTop: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            borderTop: "1px solid rgba(255,255,255,.1)",
            paddingTop: "46px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "10px",
              whiteSpace: "nowrap",
              fontFamily: BIG,
              fontWeight: 900,
              fontSize: "30px",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              lineHeight: 0.92,
            }}
          >
            <span style={{ color: "#f3f0ff" }}>Rank anything at</span>
            <span style={{ color: "#ff2e7e" }}>SORTR.IO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
