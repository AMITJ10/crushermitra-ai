import { normaliseEmail, verifyPassword } from "@crushermitra/auth";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminSessionCookieValue, adminSessionCookieName } from "../../../../../../lib/admin-session";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const email = normaliseEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  const configuredEmail = normaliseEmail(process.env.OWNER_ADMIN_EMAIL ?? "");
  const configuredHash = process.env.OWNER_ADMIN_PASSWORD_HASH ?? "";

  if (!configuredEmail || !configuredHash) {
    return redirectWithError(request, "Admin login is not configured.");
  }

  if (email !== configuredEmail || !verifyPassword(password, configuredHash)) {
    return redirectWithError(request, "Invalid admin credentials.");
  }

  const response = NextResponse.redirect(createAdminRedirectUrl(request, "/admin/dashboard"), 303);
  response.cookies.set({
    name: adminSessionCookieName,
    value: createAdminSessionCookieValue({
      email,
      name: "Owner Admin",
      role: "Super Admin",
      sessionId: randomUUID()
    }),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}

function redirectWithError(request: Request, message: string): NextResponse {
  return NextResponse.redirect(createAdminRedirectUrl(request, `/admin/login?error=${encodeURIComponent(message)}`), 303);
}

function createAdminRedirectUrl(request: Request, path: string): URL {
  const url = new URL(path, request.url);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  return url;
}
