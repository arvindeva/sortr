"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminStats, ActivityBucket } from "@/lib/admin-stats";

type Timeframe = "day" | "week" | "month" | "quarter";
const TIMEFRAMES: { key: Timeframe; label: string }[] = [
  { key: "day", label: "24h" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "3 months" },
];

// Format a bucket's ISO-ish label for the x-axis based on the timeframe.
function formatBucket(b: string, tf: Timeframe): string {
  // Stored as YYYY-MM-DDTHH:00.
  const [date, time] = b.split("T");
  if (tf === "day") return time?.slice(0, 5) ?? b; // hour: "14:00"
  const [, m, d] = date.split("-"); // month/day
  return `${m}/${d}`;
}

const MAIN = "#ff2e7e";
const CYAN = "#19e3df";
const VIOLET = "#9b6bff";
const GRID = "rgba(255,255,255,.08)";
const AXIS = "#8c87a6";

const tooltipStyle = {
  background: "#15122c",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 10,
  fontSize: 12,
  fontFamily: "var(--font-space-mono)",
};

function ChartCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  /** Rendered below the fixed-height chart area (e.g. a legend). */
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="hud mb-4 text-xs text-muted-foreground">{title}</div>
      <div className="h-[240px] w-full">{children}</div>
      {footer}
    </div>
  );
}

// A cumulative-over-time area chart (users / sorters / rankings).
function CumulativeAreaChart({
  title,
  data,
  color,
  gradientId,
}: {
  title: string;
  data: { week: string; cumulative: number }[];
  color: string;
  gradientId: string;
}) {
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            tick={{ fill: AXIS, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: AXIS }} />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// A timeframe-switchable activity bar chart (used for rankings + sorters). The
// selector is shared (controlled from the parent), so both update together.
function ActivityBarChart({
  title,
  data,
  timeframe,
  color,
  selector,
}: {
  title: string;
  data: ActivityBucket[];
  timeframe: Timeframe;
  color: string;
  selector: React.ReactNode;
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatBucket(d.bucket, timeframe),
  }));
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="hud text-xs text-muted-foreground">{title}</div>
        {selector}
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={16}
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: AXIS }}
              cursor={{ fill: "rgba(255,255,255,.04)" }}
            />
            <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AdminCharts({ stats }: { stats: AdminStats }) {
  const [timeframe, setTimeframe] = useState<Timeframe>("day");

  const authData = [
    { name: "Logged in", value: stats.rankingsByAuth.loggedIn, color: CYAN },
    { name: "Anonymous", value: stats.rankingsByAuth.anonymous, color: MAIN },
  ];

  // Shared segmented control — both activity charts switch together.
  const timeframeSelector = (
    <div className="flex gap-1 rounded-lg border border-border p-1">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf.key}
          onClick={() => setTimeframe(tf.key)}
          className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
            timeframe === tf.key
              ? "bg-main text-main-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );

  return (
    // Auto-fit: as many equal-width columns as the viewport allows (each at
    // least ~340px so charts stay readable), growing to fill the row. Big
    // screens show 3–4 across, laptops 2, mobile 1.
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fit,minmax(400px,1fr))]">
      {/* Cumulative over time: Users → Sorters → Rankings */}
      <CumulativeAreaChart
        title="Users over time (cumulative)"
        data={stats.usersOverTime}
        color={VIOLET}
        gradientId="usersFill"
      />
      <CumulativeAreaChart
        title="Sorters over time (cumulative)"
        data={stats.sortersOverTime}
        color={MAIN}
        gradientId="sortersFill"
      />
      <CumulativeAreaChart
        title="Rankings over time (cumulative)"
        data={stats.rankingsOverTime}
        color={CYAN}
        gradientId="rankingsFill"
      />

      {/* New per timeframe: Users → Sorters → Rankings */}
      <ActivityBarChart
        title="New users"
        data={stats.usersActivity[timeframe]}
        timeframe={timeframe}
        color={VIOLET}
        selector={timeframeSelector}
      />
      <ActivityBarChart
        title="New sorters"
        data={stats.sortersActivity[timeframe]}
        timeframe={timeframe}
        color={MAIN}
        selector={timeframeSelector}
      />
      <ActivityBarChart
        title="New rankings"
        data={stats.rankingsActivity[timeframe]}
        timeframe={timeframe}
        color={CYAN}
        selector={timeframeSelector}
      />

      {/* Anonymous vs logged-in rankings */}
      <ChartCard
        title="Rankings: anonymous vs logged in"
        footer={
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cyan" />
              Logged in ({stats.rankingsByAuth.loggedIn})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-main" />
              Anonymous ({stats.rankingsByAuth.anonymous})
            </span>
          </div>
        }
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={authData}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={85}
              paddingAngle={2}
              stroke="none"
            >
              {authData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
