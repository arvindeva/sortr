"use client";

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
import type { AdminStats } from "@/lib/admin-stats";

const MAIN = "#ff2e7e";
const CYAN = "#19e3df";
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="hud mb-4 text-xs text-muted-foreground">{title}</div>
      <div className="h-[240px] w-full">{children}</div>
    </div>
  );
}

export function AdminCharts({ stats }: { stats: AdminStats }) {
  const authData = [
    { name: "Logged in", value: stats.rankingsByAuth.loggedIn, color: CYAN },
    { name: "Anonymous", value: stats.rankingsByAuth.anonymous, color: MAIN },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Cumulative sorters over time */}
      <ChartCard title="Sorters over time (cumulative)">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={stats.sortersOverTime}>
            <defs>
              <linearGradient id="sortersFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MAIN} stopOpacity={0.4} />
                <stop offset="100%" stopColor={MAIN} stopOpacity={0} />
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
              stroke={MAIN}
              strokeWidth={2}
              fill="url(#sortersFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Rankings per day */}
      <ChartCard title="Rankings per day (last 12 weeks)">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.rankingsPerDay}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fill: AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: AXIS }}
              cursor={{ fill: "rgba(255,255,255,.04)" }}
            />
            <Bar dataKey="count" fill={CYAN} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* New sorters per week */}
      <ChartCard title="New sorters per week">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.sortersOverTime}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: AXIS, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: AXIS }}
              cursor={{ fill: "rgba(255,255,255,.04)" }}
            />
            <Bar dataKey="created" fill={MAIN} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Anonymous vs logged-in rankings */}
      <ChartCard title="Rankings: anonymous vs logged in">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={authData}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={90}
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
        <div className="mt-2 flex justify-center gap-5 font-mono text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-cyan" />
            Logged in ({stats.rankingsByAuth.loggedIn})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-main" />
            Anonymous ({stats.rankingsByAuth.anonymous})
          </span>
        </div>
      </ChartCard>
    </div>
  );
}
