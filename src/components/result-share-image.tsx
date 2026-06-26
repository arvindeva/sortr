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
