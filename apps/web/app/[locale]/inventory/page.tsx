import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { AppShell } from "../app-shell";
import { InventoryClient } from "./inventory-client";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
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
      title="Inventory"
      subtitle="Post stock receipts, transfers, crusher/RMC production, dispatch reductions and controlled corrections."
    >
      <InventoryClient permissions={session.permissions} />
    </AppShell>
  );
}
