import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static files, next internals, and telegram webhook
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/telegram") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const appPassword = process.env.APP_PASSWORD;

  // If no password is set in .env, permit all access
  if (!appPassword || appPassword.trim() === "") {
    return NextResponse.next();
  }

  // Check HTTP Basic Authentication
  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = Buffer.from(encoded, "base64").toString("utf-8");
        const [_user, pass] = decoded.split(":");

        // Match password
        if (pass === appPassword || decoded === appPassword) {
          return NextResponse.next();
        }
      } catch (err) {
        console.error("Failed to decode Basic Auth header:", err);
      }
    }
  }

  // Prompt browser for basic auth credentials
  return new NextResponse("Akses Dibatasi: Masukkan kata sandi di prompt browser.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="ngopai"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
