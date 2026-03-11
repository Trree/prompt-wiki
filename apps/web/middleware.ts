import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthorizedOwnerToken, isOwnerTokenConfigured, OWNER_TOKEN_COOKIE } from "./lib/auth";

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/public") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/auth")
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(OWNER_TOKEN_COOKIE)?.value;
  const isAuthorized = isAuthorizedOwnerToken(token);

  if (pathname === "/auth" && isOwnerTokenConfigured() && isAuthorized) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isPublicPath(pathname) || !isOwnerTokenConfigured()) {
    return NextResponse.next();
  }

  if (isAuthorized) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authUrl = new URL("/auth", request.url);
  authUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(authUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
