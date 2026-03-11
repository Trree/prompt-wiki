import { NextResponse } from "next/server";
import { OWNER_TOKEN_COOKIE } from "../../../../lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: OWNER_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0)
  });
  return response;
}
