import { NextResponse } from "next/server";
import {
  OWNER_SESSION_COOKIE,
  createOwnerSessionValue,
  isAuthorizedOwnerToken,
  isOwnerTokenConfigured
} from "../../../lib/auth";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function createUnauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  if (!isOwnerTokenConfigured()) {
    return NextResponse.json({ ok: true });
  }

  let token = "";

  try {
    const body = (await request.json()) as { token?: string };
    token = body.token?.trim() ?? "";
  } catch {
    return createUnauthorizedResponse();
  }

  if (!isAuthorizedOwnerToken(token)) {
    return createUnauthorizedResponse();
  }

  const sessionValue = await createOwnerSessionValue();
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: OWNER_SESSION_COOKIE,
    value: sessionValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: OWNER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
