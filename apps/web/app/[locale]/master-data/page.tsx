import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { AppShell } from "../app-shell";
import { MasterDataClient } from "./master-data-client";

export const dynamic = "force-dynamic";

export default async function MasterDataPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("masterData");
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell locale={locale} title={t("title")} subtitle={t("subtitle")}>
      <MasterDataClient
        activePlantId={session.activePlantId}
        activePlantName={session.activePlantName}
      />
    </AppShell>
  );
}
