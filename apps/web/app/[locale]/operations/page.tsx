import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { WorkflowWorkspace } from "../../../components/workflow-workspace";
import { AppShell } from "../app-shell";

export const dynamic = "force-dynamic";

export default async function OperationsPage({
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
      title="Operations"
      subtitle="View, filter and export plant operation records."
    >
      <WorkflowWorkspace resource="operations" />
    </AppShell>
  );
}
