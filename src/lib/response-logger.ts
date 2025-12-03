import http from "http";

interface LogInfo {
  method: string;
  pathname: string;
  ip: string;
  ua: string;
}

function getTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function shouldLogRequest(pathname: string): boolean {
  // Skip logging for static assets
  return (
    !pathname.startsWith("/_next/static") &&
    !pathname.startsWith("/_next/image") &&
    !pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot)$/)
  );
}

export function setupResponseLogging() {
  // Store original writeHead function
  const originalWriteHead = http.ServerResponse.prototype.writeHead;

  // Override writeHead to capture status code
  http.ServerResponse.prototype.writeHead = function (
    statusCode: number,
    ...args: any[]
  ) {
    try {
      // Get log info from response headers
      const logInfoHeader = this.getHeader("x-log-info");
      if (logInfoHeader && typeof logInfoHeader === "string") {
        const logInfo: LogInfo = JSON.parse(logInfoHeader);

        // Only log if this is a route we care about
        if (shouldLogRequest(logInfo.pathname)) {
          const timestamp = getTimestamp();
          const logLine = `[${timestamp}] ${logInfo.method} ${logInfo.pathname} ${statusCode} | ${logInfo.ip} | ${logInfo.ua}`;

          // Use console.error for 4xx and 5xx, console.log for others
          if (statusCode >= 400) {
            console.error(logLine);
          } else {
            console.log(logLine);
          }
        }

        // Remove the header so it doesn't leak to client
        this.removeHeader("x-log-info");
      }
    } catch (error) {
      // Silently fail to avoid breaking the response
    }

    // Call original writeHead
    return originalWriteHead.apply(this, [statusCode, ...args] as any);
  };
}
