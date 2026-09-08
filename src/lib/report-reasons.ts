// Report categories, shared by the report modal (labels) and the API
// (validation) so they can't drift apart. Values are stored in reports.reason.
export const REPORT_REASONS = [
  { value: "minors", label: "Sexualizes minors" },
  { value: "real-people", label: "Sexual content about a real person" },
  { value: "hate", label: "Harassment or hate" },
  { value: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export function isReportReason(value: unknown): value is ReportReason {
  return REPORT_REASONS.some((r) => r.value === value);
}
