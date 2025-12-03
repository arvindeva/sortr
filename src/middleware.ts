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

function logRequest(method: string, pathname: string, duration: number): void {
  console.log(`${method} ${pathname} ${duration}ms`);
}

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;

  // Pass request through
  const response = NextResponse.next();

  // Log request with timing
  if (shouldLogRequest(pathname)) {
    const duration = Date.now() - start;
    logRequest(request.method, pathname, duration);
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
