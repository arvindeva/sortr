export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Import and setup response logging for Node.js runtime
    const { setupResponseLogging } = await import("./lib/response-logger");
    setupResponseLogging();
  }
}
