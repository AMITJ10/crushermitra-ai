interface AdminSignupNotification {
  company?: string;
  email?: string;
  name?: string;
  phone?: string;
  selectedPlan?: string;
}

interface PasswordResetNotification {
  email: string;
  resetUrl: string;
}

export async function notifyAdminNewLead(input: AdminSignupNotification): Promise<void> {
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (!recipient) {
    return;
  }

  const payload = {
    to: recipient,
    subject: "New CrusherMitra AI lead",
    body: {
      ...input,
      signupDateTime: new Date().toISOString()
    }
  };

  if (!hasSmtp || process.env.APP_ENV === "local") {
    console.info("Development email notification", payload);
    return;
  }

  console.info("SMTP provider configured; email adapter implementation pending", payload);
}

export async function sendPasswordResetNotification(input: PasswordResetNotification): Promise<void> {
  const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && (process.env.SMTP_PASS || process.env.SMTP_PASSWORD));
  const payload = {
    to: input.email,
    subject: "Reset your CrusherMitra AI password",
    resetUrl: input.resetUrl
  };

  if (!hasSmtp || process.env.APP_ENV === "local") {
    console.info("Development password reset link", payload);
    return;
  }

  if (process.env.EMAIL_PROVIDER === "console") {
    throw new Error("Production password reset email requires SMTP or an email provider.");
  }

  console.info("SMTP provider configured; password reset email adapter implementation pending", {
    to: input.email,
    subject: payload.subject
  });
}
