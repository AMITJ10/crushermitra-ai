import { NextResponse } from "next/server";
import { sessionCookieName } from "../../../../../lib/session";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/en/login", request.url));
  response.cookies.delete(sessionCookieName);
  return response;
}
