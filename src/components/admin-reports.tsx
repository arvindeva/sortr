"use client";

import { useState } from "react";
import type { ReportRow } from "@/lib/admin-stats";
import { REPORT_REASONS } from "@/lib/report-reasons";

const reasonLabel = (value: string) =>
  REPORT_REASONS.find((r) => r.value === value)?.label ?? value;

/**
 * Moderation queue card for the admin dashboard. Take down soft-deletes the
 * sorter (and auto-resolves its open reports server-side); Resolve closes a
 * report without touching the sorter. Rows update in place — no refresh.
 */
export function AdminReports({ reports: initial }: { reports: ReportRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const act = async (row: ReportRow, action: "takedown" | "resolve") => {
    setBusyId(row.id);
    setErrorId(null);
    try {
      const res =
        action === "takedown"
          ? await fetch("/api/admin/takedown", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: row.sorterSlug }),
            })
          : await fetch(`/api/admin/reports/${row.id}`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      // A takedown resolves every open report on that sorter — drop them all.
      setRows((prev) =>
        prev.filter((r) =>
          action === "takedown"
            ? r.sorterSlug !== row.sorterSlug
            : r.id !== row.id,
        ),
      );
    } catch {
      setErrorId(row.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="hud mb-4 text-xs text-muted-foreground">
        Reports ({rows.length} open)
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center font-mono text-sm text-muted-foreground">
          Queue clear.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border bg-background/40 p-3.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-main/40 px-2.5 py-0.5 font-mono text-[11px] text-main-ink">
                  {reasonLabel(r.reason)}
                </span>
                {r.sorterDeleted ? (
                  <span className="font-mono text-[12px] text-muted-foreground line-through">
                    {r.sorterTitle ?? r.sorterSlug}
                  </span>
                ) : (
                  <a
                    href={`/sorter/${r.sorterSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[12px] text-cyan-ink underline decoration-cyan-ink/40 underline-offset-2 hover:text-main-ink"
                  >
                    {r.sorterTitle ?? r.sorterSlug}
                  </a>
                )}
              </div>
              {r.details && (
                <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">
                  {r.details}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
                <span>{new Date(r.createdAt).toLocaleString()}</span>
                {r.email && <span className="text-cyan-ink">{r.email}</span>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {!r.sorterDeleted && (
                  <button
                    onClick={() => act(r, "takedown")}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-main/50 px-3 py-1.5 font-mono text-[12px] font-bold text-main-ink transition-colors hover:bg-main/10 disabled:opacity-50"
                  >
                    Take down
                  </button>
                )}
                <button
                  onClick={() => act(r, "resolve")}
                  disabled={busyId === r.id}
                  className="rounded-lg border border-border px-3 py-1.5 font-mono text-[12px] text-foreground transition-colors hover:border-cyan/50 disabled:opacity-50"
                >
                  Resolve
                </button>
                {errorId === r.id && (
                  <span className="font-mono text-[11px] text-[#ff5a86]">
                    failed — retry
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
