import { resetPasswordSchema } from "@crushermitra/validation";
import { NextResponse } from "next/server";
import { resetPassword } from "../../../../../lib/auth-database";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const parsed = resetPasswordSchema.safeParse({
    confirmPassword: form.get("confirmPassword"),
    token: form.get("token"),
    password: form.get("password"),
    locale: form.get("locale") || "en"
  });
  const locale = parsed.success ? parsed.data.locale : "en";

  if (!parsed.success) {
    return redirect(request, `/${locale}/reset-password`, "Invalid reset request.");
  }

  try {
    const ok = await resetPassword(parsed.data.token, parsed.data.password);
    if (!ok) {
      return redirect(request, `/${locale}/reset-password`, "This reset link is invalid or expired.");
    }
    return redirect(request, `/${locale}/login`, undefined, "Password reset completed. Please sign in.");
  } catch (error) {
    console.error("Password reset failed", error);
    return redirect(request, `/${locale}/reset-password`, "Unable to reset password right now.");
  }
}

function redirect(request: Request, path: string, error?: string, notice?: string): NextResponse {
  const url = new URL(path, request.url);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  if (error) url.searchParams.set("error", error);
  if (notice) url.searchParams.set("notice", notice);
  return NextResponse.redirect(url, 303);
}
