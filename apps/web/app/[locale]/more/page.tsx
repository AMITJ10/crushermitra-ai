import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { AppShell } from "../app-shell";
import { EmptyState } from "../empty-state";

export const dynamic = "force-dynamic";

export default async function MorePage({
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
      title="More"
      subtitle="Reports, billing, configuration and AI tools will be grouped here as the product expands."
    >
      <EmptyState />
    </AppShell>
  );
}
