import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminStats, getRecentFeedback } from "@/lib/admin-stats";
import { AdminCharts } from "@/components/admin-charts";
import { TopSortersCard } from "@/components/admin-top-sorters";
import { formatCount } from "@/lib/utils";

// Private — never index, always render fresh.
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

// Admin user ids come from the ADMIN_USER_ID env var (comma-separated), set
// per-environment so dev and prod use their own ids. No ids → no admins.
function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  const allow = (process.env.ADMIN_USER_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allow.includes(userId);
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="hud text-xs text-muted-foreground">{label}</div>
      <div className="display mt-2 text-[44px] leading-none font-black text-foreground">
        {value.toLocaleString()}
      </div>
      {delta && (
        <div className="mt-2 font-mono text-xs text-cyan-ink">{delta}</div>
      )}
    </div>
  );
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  // 404 for anyone who isn't an admin — don't reveal the page exists.
  if (!isAdmin(userId)) {
    notFound();
  }

  const stats = await getAdminStats();
  const feedbackRows = await getRecentFeedback();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <div className="hud mb-2 text-xs text-cyan-ink">● Admin</div>
      <h1 className="display text-[clamp(2.5rem,7vw,3.5rem)] font-black text-foreground">
        Dashboard
      </h1>

      {/* Headline counts */}
      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="Total users"
          value={stats.totals.users}
        />
        <StatCard
          label="Total sorters"
          value={stats.totals.sorters}
          delta={`+${formatCount(stats.last7Days.sorters)} this week`}
        />
        <StatCard
          label="Total rankings"
          value={stats.totals.rankings}
          delta={`+${formatCount(stats.last7Days.rankings)} this week`}
        />
      </div>

      {/* Charts */}
      <div className="mt-5">
        <AdminCharts stats={stats} />
      </div>

      {/* Top sorters (timeframe-switchable) */}
      <TopSortersCard topSorters={stats.topSorters} />

      {/* Feedback */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="hud mb-4 text-xs text-muted-foreground">
          Feedback ({feedbackRows.length})
        </div>
        {feedbackRows.length === 0 ? (
          <p className="py-6 text-center font-mono text-sm text-muted-foreground">
            No feedback yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {feedbackRows.map((f) => (
              <li
                key={f.id}
                className="rounded-lg border border-border bg-background/40 p-3.5"
              >
                <p className="text-sm whitespace-pre-wrap text-foreground">
                  {f.message}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                  <span>{new Date(f.createdAt).toLocaleString()}</span>
                  {f.email && (
                    <span className="text-cyan-ink">{f.email}</span>
                  )}
                  {f.pageUrl && (
                    <span className="truncate opacity-70">{f.pageUrl}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
