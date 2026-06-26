"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { identify } from "@/lib/analytics";

/**
 * Associates Umami events with the logged-in user (so Retention / Journeys /
 * Cohorts can follow the same person across visits). Anonymous users are never
 * identified. Renders nothing.
 */
export function AnalyticsIdentify() {
  const { data: session, status } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  useEffect(() => {
    if (status === "authenticated" && userId) {
      identify(userId);
    }
  }, [status, userId]);

  return null;
}
