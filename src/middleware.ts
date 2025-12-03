import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function shouldLogRequest(pathname: string): boolean {
  // Skip logging for static assets to reduce noise
  return (
    !pathname.startsWith("/_next/static") &&
    !pathname.startsWith("/_next/image") &&
    !pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot)$/)
  );
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

function parseUserAgent(uaString: string): string {
  if (!uaString) return "Unknown";

  // Bots
  if (uaString.includes("Googlebot")) {
    const match = uaString.match(/Googlebot\/([0-9.]+)/);
    return match ? `Googlebot/${match[1]}` : "Googlebot";
  }
  if (uaString.includes("bingbot")) {
    const match = uaString.match(/bingbot\/([0-9.]+)/);
    return match ? `Bingbot/${match[1]}` : "Bingbot";
  }
  if (uaString.toLowerCase().includes("bot")) return "Bot";

  // Browser detection with version
  let browser = "Unknown";
  let version = "";

  // Chrome (must check before Safari)
  if (uaString.includes("Chrome/")) {
    const match = uaString.match(/Chrome\/([0-9.]+)/);
    browser = "Chrome";
    version = match ? match[1].split(".")[0] : "";
  } else if (uaString.includes("Safari/")) {
    const match = uaString.match(/Version\/([0-9.]+)/);
    browser = "Safari";
    version = match ? match[1].split(".")[0] : "";
  } else if (uaString.includes("Firefox/")) {
    const match = uaString.match(/Firefox\/([0-9.]+)/);
    browser = "Firefox";
    version = match ? match[1].split(".")[0] : "";
  } else if (uaString.includes("Edg/")) {
    const match = uaString.match(/Edg\/([0-9.]+)/);
    browser = "Edge";
    version = match ? match[1].split(".")[0] : "";
  }

  // Device and OS detection
  let device = "Desktop";
  let os = "";

  if (uaString.includes("iPhone")) {
    device = "iPhone";
    const match = uaString.match(/OS ([0-9_]+)/);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (uaString.includes("iPad")) {
    device = "iPad";
    const match = uaString.match(/OS ([0-9_]+)/);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
  } else if (uaString.includes("Android")) {
    device = "Android";
    const match = uaString.match(/Android ([0-9.]+)/);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (uaString.includes("Macintosh")) {
    device = "Mac";
    const match = uaString.match(/Mac OS X ([0-9_]+)/);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (uaString.includes("Windows")) {
    device = "Windows";
    if (uaString.includes("Windows NT 10.0")) os = "Windows 11";
    else if (uaString.includes("Windows NT")) os = "Windows";
  } else if (uaString.includes("Linux")) {
    device = "Linux";
    os = "Linux";
  }

  const browserVersion = version ? `${browser}/${version}` : browser;
  const deviceOs = os ? `${device}; ${os}` : device;

  return `${browserVersion} (${deviceOs})`;
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

function logRequest(
  method: string,
  pathname: string,
  ip: string,
  ua: string,
): void {
  const timestamp = getTimestamp();
  console.log(`[${timestamp}] ${method} ${pathname} | ${ip} | ${ua}`);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass request through
  const response = NextResponse.next();

  // Log request with detailed info
  if (shouldLogRequest(pathname)) {
    const ip = getClientIp(request);
    const uaString = request.headers.get("user-agent") || "";
    const ua = parseUserAgent(uaString);
    logRequest(request.method, pathname, ip, ua);
  }

  return response;
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    // Match all routes except Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
