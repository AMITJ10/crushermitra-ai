import { forgotPasswordSchema } from "@crushermitra/validation";
import { NextResponse } from "next/server";
import { requestPasswordReset } from "../../../../../lib/auth-database";
import { sendPasswordResetNotification } from "../../../../../lib/notifications";

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const parsed = forgotPasswordSchema.safeParse({
    email: form.get("email"),
    locale: form.get("locale") || "en"
  });
  const locale = parsed.success ? parsed.data.locale : "en";

  if (parsed.success) {
    try {
      const result = await requestPasswordReset(parsed.data.email, request.url, parsed.data.locale, {
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: request.headers.get("user-agent")
      });

      if (result.emailSent && result.resetUrl) {
        await sendPasswordResetNotification({ email: parsed.data.email, resetUrl: result.resetUrl });
      }
    } catch (error) {
      console.error("Password reset request failed", error);
    }
  }

  const url = new URL(`/${locale}/forgot-password`, request.url);
  if (url.hostname === "0.0.0.0") {
    url.hostname = "localhost";
  }
  url.searchParams.set("sent", "1");
  return NextResponse.redirect(url, 303);
}
