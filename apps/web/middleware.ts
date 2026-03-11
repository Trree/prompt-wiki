import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  OWNER_SESSION_COOKIE,
  isAuthorizedOwnerSession,
  isOwnerTokenConfigured
} from "./lib/auth";

function isPublicPath(pathname: string) {
  return pathname.startsWith("/public");
}

function createUnauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.searchParams.set("auth", "required");

  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (requestedPath !== "/") {
    redirectUrl.searchParams.set("next", requestedPath);
  }

  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    isPublicPath(pathname) ||
    !isOwnerTokenConfigured()
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(OWNER_SESSION_COOKIE)?.value;
  if (await isAuthorizedOwnerSession(sessionCookie)) {
    return NextResponse.next();
  }

  return createUnauthorizedResponse(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
