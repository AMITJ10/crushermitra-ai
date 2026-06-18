import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { AppShell } from "../app-shell";
import { BillingClient } from "./billing-client";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell locale={locale} title="Billing" subtitle="Choose a plan and simulate payment activation for local development.">
      <BillingClient />
    </AppShell>
  );
}
