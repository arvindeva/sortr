import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "@/components/ui/panel";
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
}

export function RankingImageLayout({
  sorterTitle,
  username,
  rankings,
  createdAt,
  selectedTags,
}: RankingImageLayoutProps) {
  // Split rankings into top 3 (with images) and remaining (text only)
  const top3Items = rankings.slice(0, 3);
  const remainingItems = rankings.slice(3);

  // For remaining items (4+), organize into 3 vertical columns
  const itemsPerColumn = Math.ceil(remainingItems.length / 3);
  const column1Items = remainingItems.slice(0, itemsPerColumn);
  const column2Items = remainingItems.slice(itemsPerColumn, itemsPerColumn * 2);
  const column3Items = remainingItems.slice(itemsPerColumn * 2);

  return (
    <div
      className="ranking-image-container"
      style={{
        width: "1092px", // 1080px + 6px shadow + 6px padding for shadow
        height: "auto",
        padding: "6px", // Padding to accommodate shadow
        backgroundColor: "transparent",
        boxSizing: "border-box",
      }}
    >
      <Panel
        variant="primary"
        style={{
          width: "1080px",
          backgroundColor: "#2a2a2a", // Dark grey panel background
          color: "#ffffff", // White text
          fontFamily:
            'var(--font-poppins), "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          border: "3px solid #000000",
          borderRadius: "20px", // Rounded corners
          boxShadow: "6px 6px 0px 0px #000000", // Add shadow back
          boxSizing: "border-box",
        }}
      >
        <PanelHeader
          variant="primary"
          style={{
            backgroundColor: "oklch(67.58% 0.2135 18.63)", // Primary rosa/pink color (dark mode value)
            color: "#000000", // Black text
            border: "none",
            borderBottom: "2px solid #000000",
            borderTopLeftRadius: "17px", // Match container radius minus border
            borderTopRightRadius: "17px", // Match container radius minus border
            padding: "24px", // Match footer padding for same height
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            backgroundColor: "#2a2a2a", // Dark grey content background
            padding: "32px 24px 24px 24px", // More top padding, normal side/bottom padding
          }}
        >
          {/* Top 3 Items - 1st Place Full Width, 2nd and 3rd Side-by-Side */}
          <div style={{ marginBottom: "16px" }}>
            {/* 1st Place - Full Width */}
            {top3Items.slice(0, 1).map((item, index) => (
              <Card
                key={item.id}
                style={{
                  marginBottom: "12px",
                  backgroundColor: "oklch(25.15% .0495 7.54)", // Same dark red as main background
                  border: "2px solid #000000",
                  borderRadius: "10px",
                  boxShadow: "2px 2px 0px 0px #000000",
                  padding: "0", // Override responsive padding
                }}
              >
                <CardContent
                  style={{
                    display: "flex",
                    flexDirection: "column", // Stack vertically for centering
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "16px", // Gap between image and title row
                    padding: "0", // Remove padding to avoid double padding
                    margin: "16px", // Slightly more margin for the bigger layout
                  }}
                >
                  {/* Bigger Image for 1st Place */}
                  <div
                    style={{
                      width: "200px", // 20px bigger than other top 3 items
                      height: "200px", // 20px bigger than other top 3 items
                      flexShrink: 0,
                      border: "2px solid #000000",
                      borderRadius: "10px",
                      overflow: "hidden",
                      backgroundColor: "#2a2a2a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={getImageUrl(item.imageUrl, "full")}
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
                          fontSize: "28px", // Slightly bigger for larger image
                          fontWeight: "800",
                          color: "oklch(67.58% 0.2135 18.63)", // Primary rosa color
                        }}
                      >
                        {item.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Medal Emoji and Title in same row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px", // Small gap between emoji and title
                    }}
                  >
                    <span style={{ fontSize: "32px" }}>🥇</span>
                    <span
                      style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        lineHeight: "1.3",
                        color: "#ffffff",
                      }}
                    >
                      {item.title}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* 2nd and 3rd Place - Side by Side */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                columnGap: "16px",
              }}
            >
              {top3Items.slice(1, 3).map((item, index) => (
                <Card
                  key={item.id}
                  style={{
                    backgroundColor: "oklch(25.15% .0495 7.54)", // Same dark red as main background
                    border: "2px solid #000000",
                    borderRadius: "10px",
                    boxShadow: "2px 2px 0px 0px #000000",
                    padding: "0", // Override responsive padding
                  }}
                >
                  <CardContent
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "20px",
                      padding: "0", // Remove padding to avoid double padding
                      margin: "8px 16px", // Use margin instead for spacing
                    }}
                  >
                    {/* Larger Image for Top 3 */}
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        flexShrink: 0,
                        border: "2px solid #000000",
                        borderRadius: "10px",
                        overflow: "hidden",
                        backgroundColor: "#2a2a2a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={getImageUrl(item.imageUrl, "full")}
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
                            fontSize: "24px",
                            fontWeight: "800",
                            color: "oklch(67.58% 0.2135 18.63)", // Primary rosa color
                          }}
                        >
                          {item.title.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Bigger Medal Emoji instead of rank number */}
                    <div
                      style={{
                        fontSize: "28px", // Bigger medal emoji
                        minWidth: "35px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {index === 0 ? "🥈" : "🥉"}
                    </div>

                    {/* Title without medal emoji */}
                    <div
                      style={{
                        flex: 1,
                        fontSize: "20px", // Same font size as 4+ items
                        fontWeight: "600",
                        lineHeight: "1.3",
                        color: "#ffffff",
                      }}
                    >
                      {item.title}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Remaining Items (4+) - Text Only in 3 Vertical Columns */}
          {remainingItems.length > 0 && (
            <div
              style={{
                marginTop: "16px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                columnGap: "16px", // Larger horizontal spacing for column separation
              }}
            >
              {/* Column 1 */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {column1Items.map((item, index) => (
                  <Card
                    key={item.id}
                    style={{
                      backgroundColor: "oklch(25.15% .0495 7.54)", // Same dark red as main background
                      border: "2px solid #000000",
                      borderRadius: "10px",
                      boxShadow: "2px 2px 0px 0px #000000",
                      padding: "0", // Override responsive padding
                    }}
                  >
                    <CardContent style={{ padding: "0", margin: "8px 12px" }}>
                      {" "}
                      {/* Remove padding, use margin */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#ffffff",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "700",
                            minWidth: "40px",
                            textAlign: "center",
                            color: "#cccccc",
                          }}
                        >
                          {3 + index + 1}.
                        </span>
                        <span>{item.title}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Column 2 */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {column2Items.map((item, index) => (
                  <Card
                    key={item.id}
                    style={{
                      backgroundColor: "oklch(25.15% .0495 7.54)", // Same dark red as main background
                      border: "2px solid #000000",
                      borderRadius: "10px",
                      boxShadow: "2px 2px 0px 0px #000000",
                      padding: "0", // Override responsive padding
                    }}
                  >
                    <CardContent style={{ padding: "0", margin: "8px 12px" }}>
                      {" "}
                      {/* Remove padding, use margin */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#ffffff",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "700",
                            minWidth: "40px",
                            textAlign: "center",
                            color: "#cccccc",
                          }}
                        >
                          {3 + column1Items.length + index + 1}.
                        </span>
                        <span>{item.title}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Column 3 */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {column3Items.map((item, index) => (
                  <Card
                    key={item.id}
                    style={{
                      backgroundColor: "oklch(25.15% .0495 7.54)", // Same dark red as main background
                      border: "2px solid #000000",
                      borderRadius: "10px",
                      boxShadow: "2px 2px 0px 0px #000000",
                      padding: "0", // Override responsive padding
                    }}
                  >
                    <CardContent style={{ padding: "0", margin: "8px 12px" }}>
                      {" "}
                      {/* Remove padding, use margin */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          fontSize: "16px",
                          fontWeight: "600",
                          color: "#ffffff",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: "700",
                            minWidth: "40px",
                            textAlign: "center",
                            color: "#cccccc",
                          }}
                        >
                          {3 +
                            column1Items.length +
                            column2Items.length +
                            index +
                            1}
                          .
                        </span>
                        <span>{item.title}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
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
              borderBottomLeftRadius: "17px", // Match container radius minus border
              borderBottomRightRadius: "17px", // Match container radius minus border
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
