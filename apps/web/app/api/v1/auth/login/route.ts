import { NextResponse } from "next/server";
import { authenticateDemoUser } from "@crushermitra/auth";
import { loginSchema } from "@crushermitra/validation";
import { authenticateDatabaseUser } from "../../../../../lib/auth-database";
import { createSessionCookieValue, sessionCookieName } from "../../../../../lib/session";

const defaultLocale = "en";
const genericFailure = "authentication_failed";

export async function POST(request: Request) {
  const { isJson, payload } = await parseLoginPayload(request);
  const locale = String(payload.locale ?? defaultLocale);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return loginFailure(request.url, locale, isJson);
  }

  try {
    const databaseContext = await authenticateDatabaseUser(parsed.data.email, parsed.data.password);
    const result = databaseContext
      ? { context: databaseContext, auditEvent: { reason: undefined } }
      : authenticateDemoUser(parsed.data.email, parsed.data.password);

    if (!result.context) {
      console.info("Authentication failed", {
        email: parsed.data.email.trim().toLowerCase(),
        reason: result.auditEvent.reason
      });
      return loginFailure(request.url, locale, isJson);
    }

    if (isJson) {
      const response = NextResponse.json({ ok: true, redirectTo: `/${safeLocale(locale)}` });
      setSessionCookie(response, result.context);
      return response;
    }

    const response = NextResponse.redirect(new URL(`/${safeLocale(locale)}`, request.url));
    setSessionCookie(response, result.context);
    return response;
  } catch (error) {
    console.error("Authentication error", error);
    return isJson
      ? NextResponse.json({ error: classifyLoginError(error) }, { status: 500 })
      : redirectToLogin(request.url, locale, classifyLoginError(error));
  }
}

function redirectToLogin(requestUrl: string, locale: string, error: string): NextResponse {
  const url = new URL(`/${safeLocale(locale)}/login`, requestUrl);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

async function parseLoginPayload(request: Request): Promise<{
  isJson: boolean;
  payload: Record<string, unknown>;
}> {
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  try {
    if (isJson) {
      const body = await request.json();
      return {
        isJson,
        payload: isRecord(body) ? body : {}
      };
    }

    const formData = await request.formData();
    return {
      isJson,
      payload: {
        email: formData.get("email"),
        password: formData.get("password"),
        locale: formData.get("locale")
      }
    };
  } catch {
    return { isJson, payload: {} };
  }
}

function loginFailure(requestUrl: string, locale: string, isJson: boolean): NextResponse {
  if (isJson) {
    return NextResponse.json({ error: "Could not sign in with those credentials." }, { status: 401 });
  }

  return redirectToLogin(requestUrl, locale, genericFailure);
}

function setSessionCookie(response: NextResponse, context: Parameters<typeof createSessionCookieValue>[0]) {
  response.cookies.set(sessionCookieName, createSessionCookieValue(context), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

function safeLocale(locale: string): string {
  return ["en", "hi", "mr"].includes(locale) ? locale : defaultLocale;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function classifyLoginError(error: unknown): string {
  const details = isErrorLike(error) ? `${error.code ?? ""} ${error.message ?? ""}` : "";
  if (details.includes("ECONNREFUSED")) {
    return "Database is not running or DATABASE_URL is wrong. Start PostgreSQL, then run migrations.";
  }
  if (details.includes("42P01")) {
    return "Database tables are missing. Run pnpm.cmd db:migrate and pnpm.cmd db:seed.";
  }
  if (details.includes("AUTH_SECRET")) {
    return "AUTH_SECRET is missing or shorter than 32 characters.";
  }
  return "Server temporarily unavailable. Please try again.";
}

function isErrorLike(value: unknown): value is { code?: string; message?: string } {
  return typeof value === "object" && value !== null;
}
