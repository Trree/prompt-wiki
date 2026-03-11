import { NextResponse } from "next/server";
import { isAuthorizedOwnerToken, isOwnerTokenConfigured, OWNER_TOKEN_COOKIE } from "../../../../lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";

  if (!isOwnerTokenConfigured()) {
    return NextResponse.json(
      { success: false, error: "OWNER_TOKEN is not configured." },
      { status: 503 }
    );
  }

  if (!isAuthorizedOwnerToken(token)) {
    return NextResponse.json(
      { success: false, error: "Invalid token." },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: OWNER_TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });

  return response;
}
