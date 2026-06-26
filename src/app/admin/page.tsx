import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminStats } from "@/lib/admin-stats";
import { AdminCharts } from "@/components/admin-charts";
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

      {/* Top sorters */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-5">
        <div className="hud mb-4 text-xs text-muted-foreground">
          Top sorters by plays
        </div>
        <ol className="flex flex-col gap-2">
          {stats.topSorters.map((s, i) => (
            <li
              key={s.slug}
              className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3.5 py-2.5"
            >
              <span className="display w-7 shrink-0 text-center text-lg font-black text-muted-foreground">
                {i + 1}
              </span>
              <a
                href={`/sorter/${s.slug}`}
                className="min-w-0 flex-1 truncate font-semibold text-foreground hover:text-main-ink"
              >
                {s.title}
              </a>
              <span className="shrink-0 font-mono text-[13px] text-cyan-ink">
                {s.plays.toLocaleString()} plays
              </span>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
