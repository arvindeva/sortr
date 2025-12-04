import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Panel, PanelHeader, PanelTitle, PanelContent } from "@/components/ui/panel";
import { getImageUrl } from "@/lib/image-utils";

interface RankedItem {
  id: string;
  title: string;
  imageUrl?: string;
}

interface RankingImageLayoutProps {
  sorterTitle: string;
  username: string;
  rankings: RankedItem[];
  createdAt: Date;
  selectedTags?: string[];
  // Optional resolved main color to avoid CSS var issues in html-to-image
  mainColor?: string;
  // Resolved background color for item cards
  itemBackgroundColor?: string;
}

export function RankingImageLayout({
  sorterTitle,
  username,
  rankings,
  createdAt,
  selectedTags,
  mainColor,
  itemBackgroundColor,
}: RankingImageLayoutProps) {
  // Column logic: 1 column if <= 10 items; otherwise multiple columns with 10 per column
  const totalItems = rankings.length;
  const columnCount = Math.max(1, Math.ceil(totalItems / 10));
  const columns: RankedItem[][] = Array.from({ length: columnCount }, (_, i) =>
    rankings.slice(i * 10, i * 10 + 10),
  );

  // Dynamic sizing so the image grows with column count
  const COLUMN_WIDTH = 320; // px per column (including row content width)
  const COLUMN_GAP = 16; // px between columns
  const SIDE_PADDING = 24; // px padding inside Panel content
  const PANEL_BORDER = 3; // px border width on Panel
  const OUTER_SHADOW_PAD = 6; // px container padding for shadow space

  const panelContentWidth = columnCount * COLUMN_WIDTH + (columnCount - 1) * COLUMN_GAP;
  const panelWidth = panelContentWidth + SIDE_PADDING * 2; // width property of Panel (content box)
  const containerWidth = panelWidth + PANEL_BORDER * 2 + OUTER_SHADOW_PAD * 2; // full outer container width

  return (
    <div
      className="ranking-image-container"
      style={{
        width: `${containerWidth}px`,
        height: "auto",
        padding: "6px", // Padding to accommodate shadow
        backgroundColor: "transparent",
        boxSizing: "border-box",
      }}
    >
      <Panel
        variant="primary"
        style={{
          width: `${panelWidth}px`,
          backgroundColor: "#ffffff", // Light mode panel background
          color: "#000000", // Black text
          fontFamily:
            'var(--font-poppins), "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          border: "3px solid #000000",
          borderRadius: "12px", // Rounded corners to match global border radius
          boxShadow: "none",
          boxSizing: "border-box",
        }}
      >
        <PanelHeader
          variant="primary"
          style={{
            backgroundColor: "oklch(67.58% 0.2135 18.63)", // Rosa primary
            color: "#000000", // Black text
            border: "none",
            borderBottom: "2px solid #000000",
            borderTopLeftRadius: "9px",
            borderTopRightRadius: "9px",
            padding: "24px", // Match footer padding for same height
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            minHeight: "72px", // Ensure consistent height with footer
          }}
        >
          <PanelTitle
            style={{
              color: "#000000",
              fontSize: "36px",
              fontWeight: "800",
              margin: "0",
            }}
          >
            {sorterTitle} Rankings
          </PanelTitle>
        </PanelHeader>

        <PanelContent
          style={{
            backgroundColor: "#ffffff", // Light mode content background
            padding: "24px", // Match vertical and horizontal padding
          }}
        >
          {/* Ranked items in columns (text-only), 10 items per column */}
          <div
            style={{
              marginTop: "8px",
              display: "grid",
              gridTemplateColumns: `repeat(${columnCount}, ${COLUMN_WIDTH}px)`,
              columnGap: `${COLUMN_GAP}px`,
            }}
          >
            {columns.map((col, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {col.map((item, ri) => {
                  const rankNumber = ci * 10 + ri + 1;
                  return (
                    <Card
                      key={item.id}
                      style={{
                        // Use resolved background color to match bg-background
                        // Fallback to CSS var for dev preview
                        backgroundColor:
                          itemBackgroundColor?.trim() || "var(--background)",
                        border: "2px solid #000000",
                        borderRadius: "12px",
                        boxShadow: "none",
                        padding: "0",
                      }}
                    >
                      <CardContent style={{ padding: "0", margin: "8px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px", // gap between (rank+thumb) group and title
                            fontSize: "16px",
                            fontWeight: "600",
                            color: "#000000",
                          }}
                        >
                          {/* Rank + Thumbnail group with tighter spacing */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px", // tighter gap between number and thumbnail
                            }}
                          >
                            <span
                              style={{
                                fontWeight: "800",
                                minWidth: "40px",
                                textAlign: "center",
                                color: "#555555",
                              }}
                            >
                              {rankNumber}.
                            </span>
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                flexShrink: 0,
                                border: "2px solid #000000",
                                borderRadius: "12px",
                                overflow: "hidden",
                                backgroundColor: "#f2f2f2",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {item.imageUrl ? (
                                <img
                                  src={getImageUrl(item.imageUrl, "thumbnail")}
                                  alt={item.title}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    fontSize: "18px",
                                    fontWeight: "800",
                                    color: "#000000",
                                  }}
                                >
                                  {item.title.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            style={{
                              flex: 1,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as any,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: "1.3",
                              maxHeight: "2.6em", // 2 lines * 1.3 line-height
                            }}
                          >
                            {item.title}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Promotional Footer inside panel - same height as header */}
          <div
            style={{
              width: "calc(100% + 48px)", // Full content width plus padding
              backgroundColor: "oklch(67.58% 0.2135 18.63)", // Rosa primary background
              borderTop: "2px solid #000000", // Black border
              padding: "12px", // Match header padding for same height
              textAlign: "center",
              marginTop: "32px", // Space above footer
              marginLeft: "-24px", // Extend to content edges
              marginRight: "-24px", // Extend to content edges
              marginBottom: "-24px", // Extend to bottom edge
              borderBottomLeftRadius: "9px",
              borderBottomRightRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              minHeight: "48px", // Ensure consistent height with header
            }}
          >
            <span
              style={{
                fontSize: "24px",
                fontWeight: "900",
              color: "#000000", // Black text on rosa background
              margin: "0",
            }}
            >
              sortr.io
            </span>
          </div>
        </PanelContent>
      </Panel>
    </div>
  );
}
