/**
 * Thin, type-safe wrapper around Umami custom events.
 *
 * Umami is loaded only in production (see app/layout.tsx), so `window.umami`
 * is usually absent in local dev — every call here safely no-ops when it isn't
 * present. Import and call `track(...)` from anywhere client-side; the funnel
 * analysis (Funnels / Journeys / Retention) is then built in the Umami UI on
 * top of these events.
 */

// The set of events we fire. Keep this list tight — an event is only worth
// adding if a number it produces would change what we build next.
type EventName =
  | "sort_started"
  | "sort_completed"
  | "create_started"
  | "create_completed"
  | "image_downloaded"
  | "share_clicked";

type EventData = Record<string, string | number | boolean | undefined>;

interface UmamiApi {
  track: (event: string, data?: EventData) => void;
  identify: (id: string, data?: EventData) => void;
}

function umami(): UmamiApi | null {
  if (typeof window === "undefined") return null;
  const u = (window as unknown as { umami?: UmamiApi }).umami;
  return u ?? null;
}

/** Fire a custom event. No-ops if Umami isn't loaded. */
export function track(event: EventName, data?: EventData): void {
  try {
    umami()?.track(event, data);
  } catch {
    // Never let analytics break the app.
  }
}

/**
 * Associate subsequent events with a stable user id (logged-in users only).
 * Anonymous users are never identified. Call once when the session is known.
 */
export function identify(userId: string, data?: EventData): void {
  try {
    umami()?.identify(userId, data);
  } catch {
    // ignore
  }
}
