import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getOwnerUsername, isAuthorizedBasicAuth, isOwnerTokenConfigured } from "./lib/auth";

function isPublicPath(pathname: string) {
  return pathname.startsWith("/public");
}

function createUnauthorizedResponse(request: NextRequest) {
  const headers = new Headers({
    "WWW-Authenticate": `Basic realm="Nexus Library", charset="UTF-8"`
  });

  if (request.nextUrl.pathname.startsWith("/api")) {
    headers.set("Content-Type", "application/json");
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers
    });
  }

  headers.set("Content-Type", "text/plain; charset=utf-8");
  return new NextResponse(
    `Authentication required. Sign in with username "${getOwnerUsername()}" and your OWNER_TOKEN password.`,
    {
      status: 401,
      headers
    }
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || !isOwnerTokenConfigured()) {
    return NextResponse.next();
  }

  if (isAuthorizedBasicAuth(request.headers.get("authorization"))) {
    return NextResponse.next();
  }

  return createUnauthorizedResponse(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
