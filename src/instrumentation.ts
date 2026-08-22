export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import and setup response logging for Node.js runtime
    const { setupResponseLogging } = await import("./lib/response-logger");
    setupResponseLogging();
  }
}

/**
 * Next 15 hook: called for every UNCAUGHT error while serving a request —
 * server-component renders, route handlers, server actions. Persists to the
 * serverErrors table so errors survive platform log rotation and, crucially,
 * carry the same `digest` Next shows the browser on production RSC failures
 * (making anonymized client reports joinable to real stacks). Errors handled
 * by route-level try/catch never reach this — by design.
 */
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routeType: string },
) {
  // pg isn't available on the edge runtime; middleware errors go to logs only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const e = err as {
      message?: unknown;
      stack?: unknown;
      digest?: unknown;
    } | null;
    const { logServerError } = await import("./lib/log-server-error");
    await logServerError({
      digest: typeof e?.digest === "string" ? e.digest : null,
      message: String(e?.message ?? err).slice(0, 500),
      stack: typeof e?.stack === "string" ? e.stack.slice(0, 4000) : null,
      method: request?.method?.slice(0, 10) ?? null,
      path: request?.path?.slice(0, 300) ?? null,
      routeType: context?.routeType?.slice(0, 30) ?? null,
    });
  } catch (error) {
    // The error logger must never become an error source.
    console.error("onRequestError handler failed (swallowed):", error);
  }
}
