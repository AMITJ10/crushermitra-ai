import { NextResponse } from "next/server";
import { adminSessionCookieName } from "../../../../../../lib/admin-session";

export async function POST(request: Request): Promise<NextResponse> {
  const redirectUrl = new URL("/admin/login", request.url);
  if (redirectUrl.hostname === "0.0.0.0") {
    redirectUrl.hostname = "localhost";
  }
  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.set({
    name: adminSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
