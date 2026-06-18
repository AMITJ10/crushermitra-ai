import { normaliseEmail } from "@crushermitra/auth";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authenticatePlatformAdmin, getPlatformAdminStatus } from "../../../../../../lib/auth-database";
import { createAdminSessionCookieValue, adminSessionCookieName } from "../../../../../../lib/admin-session";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const email = normaliseEmail(String(form.get("email") ?? ""));
  const password = String(form.get("password") ?? "");
  let admin: Awaited<ReturnType<typeof authenticatePlatformAdmin>> = null;

  try {
    admin = await authenticatePlatformAdmin(email, password);
  } catch (error) {
    console.error("Admin login failed", error);
    return redirectWithError(request, classifyAdminLoginError(error));
  }

  if (!admin) {
    try {
      const status = await getPlatformAdminStatus(email);
      if (!status.exists) {
        return redirectWithError(request, "Platform admin account is missing. Run migrations, then run db:create-platform-admin.");
      }
      if (!status.matchingEmailExists) {
        return redirectWithError(request, "No platform admin record exists for that email. Use amitjadhav7383@gmail.com or recreate the admin account.");
      }
      return redirectWithError(request, "Password is incorrect for this platform admin account.");
    } catch (error) {
      console.error("Admin login status check failed", error);
      return redirectWithError(request, classifyAdminLoginError(error));
    }
  }

  const response = NextResponse.redirect(createAdminRedirectUrl(request, "/admin/dashboard"), 303);
  response.cookies.set({
    name: adminSessionCookieName,
    value: createAdminSessionCookieValue({
      email,
      name: admin.name,
      role: "Platform Admin",
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

function classifyAdminLoginError(error: unknown): string {
  const details = isErrorLike(error) ? `${error.code ?? ""} ${error.message ?? ""}` : "";
  if (details.includes("ECONNREFUSED")) {
    return "Database is not running or DATABASE_URL is wrong. Start PostgreSQL, then run migrations.";
  }
  if (details.includes("42P01") || details.includes("platform_admins")) {
    return "Admin database tables are missing. Run pnpm.cmd db:migrate, then pnpm.cmd db:create-platform-admin.";
  }
  if (details.includes("AUTH_SECRET") || details.includes("ADMIN_AUTH_SECRET")) {
    return "ADMIN_AUTH_SECRET or AUTH_SECRET is missing or shorter than 32 characters.";
  }
  return "Admin login cannot be checked right now. Verify PostgreSQL, migrations and platform admin setup.";
}

function isErrorLike(value: unknown): value is { code?: string; message?: string } {
  return typeof value === "object" && value !== null;
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
