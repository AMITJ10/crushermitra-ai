import { signupSchema } from "@crushermitra/validation";
import { NextResponse } from "next/server";
import { signupOrganisation } from "../../../../../lib/auth-database";
import { createSessionCookieValue, sessionCookieName } from "../../../../../lib/session";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const parsed = signupSchema.safeParse({
    businessType: form.get("businessType"),
    confirmPassword: form.get("confirmPassword"),
    district: form.get("district") || "Pune",
    email: form.get("email"),
    fullName: form.get("fullName") || form.get("name"),
    locale: form.get("locale") || "en",
    pan: emptyToUndefined(form.get("pan")),
    password: form.get("password"),
    mobile: form.get("mobile") || form.get("phone"),
    organisationName: form.get("organisationName") || form.get("companyName"),
    pincode: form.get("pincode"),
    defaultPlantName: emptyToUndefined(form.get("defaultPlantName") || form.get("plantName")),
    state: form.get("state") || "Maharashtra",
    termsAccepted: form.get("termsAccepted") === "on" || form.get("termsAccepted") === "true"
  });
  const locale = safeLocale(String(form.get("locale") ?? "en"));

  if (!parsed.success) {
    return redirectToSignup(request, locale, formatSignupError(parsed.error));
  }

  try {
    const context = await signupOrganisation(parsed.data);
    const response = NextResponse.redirect(createRedirectUrl(request, `/${context.locale}/dashboard`), 303);
    response.cookies.set(sessionCookieName, createSessionCookieValue(context), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.APP_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8
    });
    return response;
  } catch (error) {
    console.error("Signup failed", error);
    const message = classifySignupError(error);
    return redirectToSignup(request, locale, message);
  }
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function redirectToSignup(request: Request, locale: string, message: string): NextResponse {
  const url = createRedirectUrl(request, `/${locale}/login`);
  url.searchParams.set("mode", "signup");
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, 303);
}

function formatSignupError(error: { issues: Array<{ message: string; path: Array<string | number> }> }): string {
  const first = error.issues[0];
  const field = first?.path[0] ? humanFieldName(String(first.path[0])) : "Signup details";
  return first ? `${field}: ${first.message}` : "Please check the signup details and try again.";
}

function humanFieldName(field: string): string {
  const labels: Record<string, string> = {
    businessType: "Business type",
    confirmPassword: "Confirm password",
    defaultPlantName: "Default plant name",
    district: "District",
    email: "Email",
    fullName: "Full name",
    mobile: "Mobile number",
    organisationName: "Organisation name",
    pan: "PAN",
    password: "Password",
    pincode: "PIN code",
    state: "State",
    termsAccepted: "Terms"
  };
  return labels[field] ?? field;
}

function classifySignupError(error: unknown): string {
  if (error instanceof Error && error.message === "An account already exists for this email.") {
    return error.message;
  }

  const details = isErrorLike(error) ? `${error.code ?? ""} ${error.message ?? ""}` : "";
  if (details.includes("ECONNREFUSED")) {
    return "Database is not running or DATABASE_URL is wrong. Start PostgreSQL, then run migrations.";
  }
  if (details.includes("42P01")) {
    return "Database tables are missing. Run pnpm.cmd db:migrate and pnpm.cmd db:seed.";
  }
  if (details.includes("23505")) {
    return "An account already exists for this email or plant code.";
  }
  if (details.includes("23502")) {
    return "A required database field is missing. Check all required signup fields.";
  }
  if (details.includes("AUTH_SECRET")) {
    return "AUTH_SECRET is missing or shorter than 32 characters.";
  }
  return "Unable to create account right now. Please check the fields and try again.";
}

function isErrorLike(value: unknown): value is { code?: string; message?: string } {
  return typeof value === "object" && value !== null;
}

function createRedirectUrl(request: Request, path: string): URL {
  const url = new URL(path, request.url);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  return url;
}

function safeLocale(locale: string): "en" | "hi" | "mr" {
  return locale === "hi" || locale === "mr" ? locale : "en";
}
