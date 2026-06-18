import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { AppShell } from "../app-shell";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
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
    <AppShell locale={locale} title="Reports" subtitle="Sales, dispatch, production, receivables, payment and operations reporting.">
      <ReportsClient />
    </AppShell>
  );
}
