import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { WorkflowWorkspace } from "../../../components/workflow-workspace";
import { AppShell } from "../app-shell";

export const dynamic = "force-dynamic";

export default async function OrdersPage({
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
    <AppShell
      locale={locale}
      title="Orders"
      subtitle="View, filter and export order records created from Master Data workflows."
    >
      <WorkflowWorkspace resource="orders" />
    </AppShell>
  );
}
