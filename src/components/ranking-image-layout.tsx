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
          color: "#1a1625", // Foreground (new design)
          fontFamily:
            'var(--font-geist-sans), "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          border: "1px solid #e9e6ee",
          borderRadius: "10px", // Match global radius (--radius-base)
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          boxSizing: "border-box",
        }}
      >
        <PanelHeader
          variant="primary"
          style={{
            backgroundColor: "#da1b61", // Brand magenta (--main)
            color: "#ffffff", // White text on magenta
            border: "none",
            borderBottom: "1px solid #e9e6ee",
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
              color: "#ffffff",
              fontSize: "36px",
              fontWeight: "700",
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
                        border: "1px solid #e9e6ee",
                        borderRadius: "10px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
                            color: "#1a1625",
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
                                fontWeight: "700",
                                minWidth: "40px",
                                textAlign: "center",
                                color: "#6f6880",
                              }}
                            >
                              {rankNumber}.
                            </span>
                            <div
                              style={{
                                width: "48px",
                                height: "48px",
                                flexShrink: 0,
                                border: "1px solid #e9e6ee",
                                borderRadius: "10px",
                                overflow: "hidden",
                                backgroundColor: "#f2f0f5",
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
                                    fontWeight: "700",
                                    color: "#6f6880",
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
              backgroundColor: "#da1b61", // Brand magenta (--main)
              borderTop: "1px solid #e9e6ee",
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
                fontWeight: "800",
              color: "#ffffff", // White text on magenta
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
