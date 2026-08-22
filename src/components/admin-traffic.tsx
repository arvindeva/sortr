"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrafficStats } from "@/lib/umami-stats";
import { formatCount } from "@/lib/utils";

const AXIS = "#8c87a6";

const tooltipStyle = {
  background: "#15122c",
  border: "1px solid rgba(255,255,255,.12)",
  borderRadius: 10,
  fontSize: 12,
  fontFamily: "var(--font-mona-sans)",
};

function Tile({
  label,
  value,
  sub,
  warn,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="hud text-xs text-muted-foreground">{label}</div>
      <div
        className={`display mt-2 text-[44px] leading-none font-black ${warn ? "text-main-ink" : "text-foreground"}`}
      >
        {value}
      </div>
      {sub && (
        <div className="mt-2 font-mono text-xs text-cyan-ink">{sub}</div>
      )}
    </div>
  );
}

/**
 * The admin dashboard's Traffic section, fed by the Umami analytics DB
 * (lib/umami-stats). Tiles match the weekly rituals: the visitors trend (the
 * "is growth flattening" tripwire), the two core funnel rates, and the
 * client_error watch. One chart: weekly visitors — the wave-ratchet at a
 * glance.
 */
export function AdminTraffic({ traffic }: { traffic: TrafficStats }) {
  const delta =
    traffic.visitorsPrev7d > 0
      ? Math.round(
          ((traffic.visitors7d - traffic.visitorsPrev7d) /
            traffic.visitorsPrev7d) *
            100,
        )
      : 0;
  const completionRate =
    traffic.sortStarts7d > 0
      ? Math.round((traffic.sortCompletes7d / traffic.sortStarts7d) * 100)
      : 0;
  const imageRate =
    traffic.sortCompletes7d > 0
      ? Math.round((traffic.imageDownloads7d / traffic.sortCompletes7d) * 100)
      : 0;

  // Drop the (partial) current week from the charts so the last bar doesn't
  // always look like a crash in progress.
  const weekly = traffic.weeklyVisitors.slice(0, -1);
  // ?? []: a bundle cached before this field existed survives the 1h TTL.
  const funnelWeekly = (traffic.weeklyFunnel ?? []).slice(0, -1);

  return (
    <section className="mt-10">
      <h2 className="display mb-4 text-2xl font-black text-foreground">
        Traffic
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Visitors (7d)"
          value={formatCount(traffic.visitors7d)}
          sub={`${delta >= 0 ? "+" : ""}${delta}% vs prior week`}
        />
        <Tile
          label="Sort completion (7d)"
          value={`${completionRate}%`}
          sub={`${formatCount(traffic.sortCompletes7d)} of ${formatCount(traffic.sortStarts7d)} started`}
        />
        <Tile
          label="Images per completion (7d)"
          value={`${imageRate}%`}
          sub={`${formatCount(traffic.imageDownloads7d)} share images`}
        />
        <Tile
          label="Client errors (24h)"
          value={formatCount(traffic.clientErrors24h)}
          sub="from the global error boundary"
          warn={traffic.clientErrors24h > 500}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="hud mb-4 text-xs text-muted-foreground">
            Visitors per week
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <XAxis
                  dataKey="week"
                  stroke={AXIS}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(w: string) => w.slice(5)}
                />
                <YAxis
                  stroke={AXIS}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => formatCount(v)}
                  width={44}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "rgba(255,255,255,.04)" }}
                  formatter={(v) => [Number(v).toLocaleString(), "visitors"]}
                />
                <Bar
                  dataKey="visitors"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {funnelWeekly.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="hud mb-4 text-xs text-muted-foreground">
              Sorts per week{" "}
              <span className="text-main-ink">■ started</span>{" "}
              <span className="text-cyan-ink">■ completed</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelWeekly} barGap={2}>
                  <XAxis
                    dataKey="week"
                    stroke={AXIS}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(w: string) => w.slice(5)}
                  />
                  <YAxis
                    stroke={AXIS}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCount(v)}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(255,255,255,.04)" }}
                    formatter={(v, name) => [Number(v).toLocaleString(), name]}
                  />
                  <Bar
                    dataKey="started"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="completed"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
