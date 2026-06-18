interface AdminSignupNotification {
  company?: string;
  email?: string;
  name?: string;
  phone?: string;
  selectedPlan?: string;
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
